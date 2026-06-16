const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const sqlite3 = require('sqlite3').verbose();
const { Kafka } = require('kafkajs');
const path = require('path');

const generateId = () => Math.random().toString(36).substring(2, 15);

const PROTO_PATH = path.join(__dirname, '../../proto/booking.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const bookingProto = grpc.loadPackageDefinition(packageDefinition).booking;

const db = new sqlite3.Database('./booking.db');
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS bookings (id TEXT PRIMARY KEY, user_id TEXT, item_id TEXT, start_date TEXT, end_date TEXT, status TEXT)");
});

const kafka = new Kafka({ clientId: 'booking-service', brokers: [process.env.KAFKA_BROKER || 'localhost:9092'] });
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'booking-group' });

async function initKafka() {
  try {
    await producer.connect();
    await consumer.connect();
    await consumer.subscribe({ topic: 'payment.failed', fromBeginning: false });
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        if (topic === 'payment.failed') {
          const evt = JSON.parse(message.value.toString());
          db.run("UPDATE bookings SET status = 'CANCELLED' WHERE id = ?", [evt.booking_id]);
          console.log(`Booking ${evt.booking_id} cancelled due to payment failure.`);
        }
      },
    });
    console.log('Booking Service connected to Kafka');
  } catch (err) {
    console.error('Kafka connection error', err);
  }
}
initKafka();

const createBooking = (call, callback) => {
  const { user_id, item_id, start_date, end_date } = call.request;
  const id = generateId();
  const status = 'PENDING';
  
  db.run("INSERT INTO bookings (id, user_id, item_id, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?)", 
    [id, user_id, item_id, start_date, end_date, status], async function(err) {
    if (err) {
      callback({ code: grpc.status.INTERNAL, message: err.message });
      return;
    }
    const booking = { id, user_id, item_id, start_date, end_date, status };
    
    try {
      await producer.send({
        topic: 'booking.created',
        messages: [{ value: JSON.stringify(booking) }],
      });
    } catch (e) {
      console.error('Failed to send kafka message', e);
    }

    callback(null, booking);
  });
};

const getBooking = (call, callback) => {
  db.get("SELECT * FROM bookings WHERE id = ?", [call.request.id], (err, row) => {
    if (err) callback({ code: grpc.status.INTERNAL, message: err.message });
    else if (!row) callback({ code: grpc.status.NOT_FOUND, message: 'Booking not found' });
    else callback(null, row);
  });
};

const getUserBookings = (call, callback) => {
  db.all("SELECT * FROM bookings WHERE user_id = ?", [call.request.user_id], (err, rows) => {
    if (err) callback({ code: grpc.status.INTERNAL, message: err.message });
    else callback(null, { bookings: rows });
  });
};

const cancelBooking = (call, callback) => {
  const id = call.request.id;
  db.run("UPDATE bookings SET status = 'CANCELLED' WHERE id = ?", [id], async function(err) {
    if (err) {
      callback({ code: grpc.status.INTERNAL, message: err.message });
      return;
    }
    
    try {
      await producer.send({
        topic: 'booking.cancelled',
        messages: [{ value: JSON.stringify({ id }) }],
      });
    } catch (e) {
      console.error('Failed to send kafka message', e);
    }
    
    db.get("SELECT * FROM bookings WHERE id = ?", [id], (err, row) => {
      callback(null, row);
    });
  });
};

function main() {
  const server = new grpc.Server();
  server.addService(bookingProto.BookingService.service, { 
    CreateBooking: createBooking, 
    GetBooking: getBooking,
    GetUserBookings: getUserBookings,
    CancelBooking: cancelBooking
  });
  const port = process.env.PORT || '50053';
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), () => {
    server.start();
    console.log(`Booking Service running at http://0.0.0.0:${port}`);
  });
}

main();

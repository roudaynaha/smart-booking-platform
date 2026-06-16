const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { Kafka } = require('kafkajs');
const path = require('path');
const { createRxDatabase, addRxPlugin } = require('rxdb');
const { getRxStorageMemory } = require('rxdb/plugins/storage-memory');

const generateId = () => Math.random().toString(36).substring(2, 15);

const PROTO_PATH = path.join(__dirname, '../../proto/payment.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const paymentProto = grpc.loadPackageDefinition(packageDefinition).payment;

let db;
let paymentsCollection;

async function initDB() {
  db = await createRxDatabase({
    name: 'paymentdb',
    storage: getRxStorageMemory()
  });

  const paymentSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
      id: { type: 'string', maxLength: 100 },
      booking_id: { type: 'string' },
      amount: { type: 'number' },
      status: { type: 'string' }
    },
    required: ['id', 'booking_id', 'amount', 'status']
  };

  await db.addCollections({
    payments: { schema: paymentSchema }
  });

  paymentsCollection = db.payments;
  console.log('RxDB initialized for Payment Service');
}

const kafka = new Kafka({ clientId: 'payment-service', brokers: [process.env.KAFKA_BROKER || 'localhost:9092'] });
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'payment-group' });

async function initKafka() {
  try {
    await producer.connect();
    await consumer.connect();
    await consumer.subscribe({ topic: 'booking.created', fromBeginning: false });
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        if (topic === 'booking.created') {
          const evt = JSON.parse(message.value.toString());
          console.log(`Received booking.created for ${evt.id}, simulating payment...`);
          // simulate automatic payment
          const paymentId = generateId();
          const amount = 100.0; // dummy amount
          const status = 'SUCCESS'; // simulate success

          await paymentsCollection.insert({
            id: paymentId,
            booking_id: evt.id,
            amount,
            status
          });

          await producer.send({
            topic: 'payment.completed',
            messages: [{ value: JSON.stringify({ id: paymentId, booking_id: evt.id, amount, status }) }],
          });
        }
      },
    });
    console.log('Payment Service connected to Kafka');
  } catch (err) {
    console.error('Kafka connection error', err);
  }
}

const getPayment = async (call, callback) => {
  const doc = await paymentsCollection.findOne({ selector: { booking_id: call.request.booking_id } }).exec();
  if (!doc) callback({ code: grpc.status.NOT_FOUND, message: 'Payment not found' });
  else callback(null, doc.toJSON());
};

const pay = async (call, callback) => {
  const { booking_id, amount, payment_method } = call.request;
  const id = generateId();
  const status = 'SUCCESS';
  
  await paymentsCollection.insert({
    id, booking_id, amount, status
  });

  try {
    await producer.send({
      topic: 'payment.completed',
      messages: [{ value: JSON.stringify({ id, booking_id, amount, status }) }],
    });
  } catch (e) {}

  callback(null, { id, booking_id, amount, status });
};

async function main() {
  await initDB();
  await initKafka();

  const server = new grpc.Server();
  server.addService(paymentProto.PaymentService.service, { GetPayment: getPayment, Pay: pay });
  const port = process.env.PORT || '50054';
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), () => {
    server.start();
    console.log(`Payment Service running at http://0.0.0.0:${port}`);
  });
}

main();

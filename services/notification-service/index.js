const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { Kafka } = require('kafkajs');
const path = require('path');
const { createRxDatabase, addRxPlugin } = require('rxdb');
const { getRxStorageMemory } = require('rxdb/plugins/storage-memory');

const generateId = () => Math.random().toString(36).substring(2, 15);

const PROTO_PATH = path.join(__dirname, '../../proto/notification.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const notificationProto = grpc.loadPackageDefinition(packageDefinition).notification;

let db;
let notificationsCollection;

async function initDB() {
  db = await createRxDatabase({
    name: 'notificationdb',
    storage: getRxStorageMemory()
  });

  const notificationSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
      id: { type: 'string', maxLength: 100 },
      user_id: { type: 'string' },
      message: { type: 'string' },
      type: { type: 'string' }
    },
    required: ['id', 'user_id', 'message', 'type']
  };

  await db.addCollections({
    notifications: { schema: notificationSchema }
  });

  notificationsCollection = db.notifications;
  console.log('RxDB initialized for Notification Service');
}

const kafka = new Kafka({ clientId: 'notification-service', brokers: [process.env.KAFKA_BROKER || 'localhost:9092'] });
const consumer = kafka.consumer({ groupId: 'notification-group' });

async function initKafka() {
  try {
    await consumer.connect();
    await consumer.subscribe({ topics: ['booking.cancelled', 'payment.completed', 'user.created'], fromBeginning: false });
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const evt = JSON.parse(message.value.toString());
        let msg = '';
        let type = '';
        let userId = evt.user_id || 'unknown'; // Note: In real life, might need to lookup user_id via gRPC

        if (topic === 'booking.cancelled') {
          msg = `Your booking ${evt.id} has been cancelled.`;
          type = 'BOOKING_CANCELLED';
        } else if (topic === 'payment.completed') {
          msg = `Payment for booking ${evt.booking_id} successful.`;
          type = 'PAYMENT_SUCCESS';
        } else if (topic === 'user.created') {
          msg = `Welcome ${evt.name}!`;
          type = 'WELCOME';
          userId = evt.id;
        }

        if (msg) {
          const id = generateId();
          await notificationsCollection.insert({
            id, user_id: userId, message: msg, type
          });
          console.log(`Notification created: ${msg}`);
        }
      },
    });
    console.log('Notification Service connected to Kafka');
  } catch (err) {
    console.error('Kafka connection error', err);
  }
}

const getNotifications = async (call, callback) => {
  const docs = await notificationsCollection.find({ selector: { user_id: call.request.user_id } }).exec();
  callback(null, { notifications: docs.map(d => d.toJSON()) });
};

async function main() {
  await initDB();
  await initKafka();

  const server = new grpc.Server();
  server.addService(notificationProto.NotificationService.service, { GetNotifications: getNotifications });
  const port = process.env.PORT || '50055';
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), () => {
    server.start();
    console.log(`Notification Service running at http://0.0.0.0:${port}`);
  });
}

main();

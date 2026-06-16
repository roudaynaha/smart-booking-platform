const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const sqlite3 = require('sqlite3').verbose();
const { Kafka } = require('kafkajs');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // Need to install uuid if not there, or we just use basic random

// Since uuid is not installed, we'll use a simple fallback
const generateId = () => Math.random().toString(36).substring(2, 15);

const PROTO_PATH = path.join(__dirname, '../../proto/user.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const userProto = grpc.loadPackageDefinition(packageDefinition).user;

const db = new sqlite3.Database('./users.db');
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, email TEXT, password TEXT)");
});

const kafka = new Kafka({ clientId: 'user-service', brokers: [process.env.KAFKA_BROKER || 'localhost:9092'] });
const producer = kafka.producer();

async function initKafka() {
  try {
    await producer.connect();
    console.log('User Service connected to Kafka');
  } catch (err) {
    console.error('Kafka connection error', err);
  }
}
initKafka();

const getUser = (call, callback) => {
  db.get("SELECT id, name, email FROM users WHERE id = ?", [call.request.id], (err, row) => {
    if (err) callback({ code: grpc.status.INTERNAL, message: err.message });
    else if (!row) callback({ code: grpc.status.NOT_FOUND, message: 'User not found' });
    else callback(null, row);
  });
};

const createUser = async (call, callback) => {
  const { name, email, password } = call.request;
  const id = generateId();
  db.run("INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)", [id, name, email, password], async function(err) {
    if (err) {
      callback({ code: grpc.status.INTERNAL, message: err.message });
      return;
    }
    const user = { id, name, email };
    
    try {
      await producer.send({
        topic: 'user.created',
        messages: [{ value: JSON.stringify(user) }],
      });
    } catch (e) {
      console.error('Failed to send kafka message', e);
    }

    callback(null, user);
  });
};

function main() {
  const server = new grpc.Server();
  server.addService(userProto.UserService.service, { GetUser: getUser, CreateUser: createUser });
  const port = process.env.PORT || '50051';
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), () => {
    server.start();
    console.log(`User Service running at http://0.0.0.0:${port}`);
  });
}

main();

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_DIR = path.join(__dirname, '../../proto');

const loadProto = (filename) => {
  const packageDefinition = protoLoader.loadSync(path.join(PROTO_DIR, filename), {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
  return grpc.loadPackageDefinition(packageDefinition);
};

const userProto = loadProto('user.proto').user;
const catalogProto = loadProto('catalog.proto').catalog;
const bookingProto = loadProto('booking.proto').booking;
const paymentProto = loadProto('payment.proto').payment;
const notificationProto = loadProto('notification.proto').notification;

const clients = {
  user: new userProto.UserService(process.env.USER_SERVICE_URL || 'localhost:50051', grpc.credentials.createInsecure()),
  catalog: new catalogProto.CatalogService(process.env.CATALOG_SERVICE_URL || 'localhost:50052', grpc.credentials.createInsecure()),
  booking: new bookingProto.BookingService(process.env.BOOKING_SERVICE_URL || 'localhost:50053', grpc.credentials.createInsecure()),
  payment: new paymentProto.PaymentService(process.env.PAYMENT_SERVICE_URL || 'localhost:50054', grpc.credentials.createInsecure()),
  notification: new notificationProto.NotificationService(process.env.NOTIFICATION_SERVICE_URL || 'localhost:50055', grpc.credentials.createInsecure())
};

const grpcCall = (client, method, request) => {
  return new Promise((resolve, reject) => {
    client[method](request, (error, response) => {
      if (error) reject(error);
      else resolve(response);
    });
  });
};

module.exports = {
  clients,
  grpcCall
};

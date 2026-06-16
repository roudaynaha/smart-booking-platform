const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const generateId = () => Math.random().toString(36).substring(2, 15);

const PROTO_PATH = path.join(__dirname, '../../proto/catalog.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const catalogProto = grpc.loadPackageDefinition(packageDefinition).catalog;

const db = new sqlite3.Database('./catalog.db');
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, name TEXT, description TEXT, type TEXT, price REAL, available BOOLEAN)");
});

const getItem = (call, callback) => {
  db.get("SELECT * FROM items WHERE id = ?", [call.request.id], (err, row) => {
    if (err) callback({ code: grpc.status.INTERNAL, message: err.message });
    else if (!row) callback({ code: grpc.status.NOT_FOUND, message: 'Item not found' });
    else callback(null, { ...row, available: row.available === 1 });
  });
};

const searchItems = (call, callback) => {
  const { query, type } = call.request;
  let sql = "SELECT * FROM items WHERE name LIKE ?";
  const params = [`%${query}%`];
  if (type) {
    sql += " AND type = ?";
    params.push(type);
  }
  db.all(sql, params, (err, rows) => {
    if (err) callback({ code: grpc.status.INTERNAL, message: err.message });
    else {
      const items = rows.map(r => ({ ...r, available: r.available === 1 }));
      callback(null, { items });
    }
  });
};

const createItem = (call, callback) => {
  const { name, description, type, price } = call.request;
  const id = generateId();
  db.run("INSERT INTO items (id, name, description, type, price, available) VALUES (?, ?, ?, ?, ?, ?)", 
    [id, name, description, type, price, 1], function(err) {
    if (err) callback({ code: grpc.status.INTERNAL, message: err.message });
    else callback(null, { id, name, description, type, price, available: true });
  });
};

function main() {
  const server = new grpc.Server();
  server.addService(catalogProto.CatalogService.service, { GetItem: getItem, SearchItems: searchItems, CreateItem: createItem });
  const port = process.env.PORT || '50052';
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), () => {
    server.start();
    console.log(`Catalog Service running at http://0.0.0.0:${port}`);
  });
}

main();

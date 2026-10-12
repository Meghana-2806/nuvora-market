const { MongoClient } = require('mongodb');
const Redis = require('ioredis');
const config = require('./config');

const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 3 });
redis.on('error', (e) => console.error('[redis] error:', e.message));

let client;
let db;

async function connectMongo() {
  client = new MongoClient(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  db = client.db(config.mongoDb);
  return db;
}

const getDb = () => {
  if (!db) throw new Error('MongoDB not connected');
  return db;
};

async function ensureIndexes() {
  const d = getDb();
  await d.collection('products').createIndexes([
    { key: { sku: 1 }, unique: true },
    { key: { category: 1, price: 1 } },
    { key: { title: 'text', description: 'text', brand: 'text' }, name: 'product_text' }
  ]);
  await d.collection('users').createIndex({ email: 1 }, { unique: true });
  await d.collection('orders').createIndexes([
    { key: { userId: 1, createdAt: -1 } },
    { key: { createdAt: -1 } },
    { key: { 'shippingAddress.city': 1 } },
    { key: { 'items.category': 1 } }
  ]);
}

async function close() {
  if (client) await client.close();
  redis.disconnect();
}

module.exports = { redis, connectMongo, getDb, ensureIndexes, close };

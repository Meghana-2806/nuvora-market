/* Seeds MongoDB (products, users, ~450 historical orders) and rebuilds the Redis leaderboard. */
const { connectMongo, getDb, ensureIndexes, redis, close } = require('../src/db');
const keys = require('../src/keys');
const { hashPassword } = require('../src/utils/password');
const { products, cities } = require('./catalog');

// simple seeded RNG so the data is repeatable
let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// city weights -> some cities sell more (makes charts interesting)
const cityWeights = [
  ['Bengaluru', 22], ['Mumbai', 20], ['Delhi', 18], ['Hyderabad', 15],
  ['Chennai', 9], ['Pune', 7], ['Kolkata', 5], ['Vijayawada', 4]
];
const weightedCity = () => {
  const total = cityWeights.reduce((s, c) => s + c[1], 0);
  let r = rand() * total;
  for (const [c, w] of cityWeights) { if ((r -= w) <= 0) return c; }
  return cityWeights[0][0];
};

// popular products get higher weight (power-law-ish)
const weightedProduct = (list) => {
  const w = list.map((_, i) => 1 / (1 + i * 0.35) + rand() * 0.4);
  const total = w.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < list.length; i++) { if ((r -= w[i]) <= 0) return list[i]; }
  return list[0];
};

(async () => {
  await connectMongo();
  const db = getDb();

  console.log('Clearing old data...');
  await Promise.all(['products', 'users', 'orders'].map((c) => db.collection(c).deleteMany({})));
  const stale = await redis.keys('cache:analytics:*');
  if (stale.length) await redis.del(stale);
  await redis.del(keys.leaderboard);

  await ensureIndexes();

  // ---- users ----
  const names = ['Aarav Sharma', 'Diya Reddy', 'Rohan Mehta', 'Ananya Iyer', 'Karthik Rao', 'Sneha Patel',
    'Vikram Singh', 'Meghana Reddy', 'Arjun Nair', 'Priya Das', 'Ishaan Gupta', 'Kavya Menon'];
  const demoHash = hashPassword('demo123');
  const users = names.map((n, i) => ({
    name: n,
    email: i === 0 ? 'demo@nuvora.com' : `${n.split(' ')[0].toLowerCase()}${i}@example.com`,
    passwordHash: demoHash,
    role: 'customer',
    city: cities[i % cities.length],
    createdAt: new Date(Date.now() - 60 * 864e5)
  }));
  const { insertedIds } = await db.collection('users').insertMany(users);
  const userDocs = users.map((u, i) => ({ ...u, _id: insertedIds[i] }));

  // ---- products ----
  const pdocs = products.map((p) => ({ ...p }));

  // ---- historical orders (last 30 days) ----
  const orders = [];
  const soldBySku = {};
  for (let i = 0; i < 450; i++) {
    const user = pick(userDocs);
    const itemCount = 1 + Math.floor(rand() * 3);
    const chosen = new Map();
    for (let k = 0; k < itemCount; k++) {
      const p = weightedProduct(pdocs);
      chosen.set(p.sku, (chosen.get(p.sku) || 0) + 1 + Math.floor(rand() * 2));
    }
    const items = [...chosen.entries()].map(([sku, qty]) => {
      const p = pdocs.find((x) => x.sku === sku);
      soldBySku[sku] = (soldBySku[sku] || 0) + qty;
      return { sku, title: p.title, category: p.category, emoji: p.emoji, price: p.price, qty };
    });
    const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
    const shipping = subtotal >= 499 ? 0 : 40;
    const gst = Math.round(subtotal * 0.18 * 100) / 100;
    const created = new Date(Date.now() - Math.floor(rand() * 30 * 864e5));
    orders.push({
      orderNo: `NV-${(100000 + i).toString(36).toUpperCase()}`,
      userId: user._id,
      customerName: user.name,
      items,
      subtotal, discount: 0, shipping, gst,
      total: Math.round((subtotal + gst + shipping) * 100) / 100,
      coupon: null,
      paymentMethod: pick(['UPI', 'Card', 'COD', 'NetBanking']),
      status: pick(['Delivered', 'Delivered', 'Delivered', 'Shipped', 'Placed']),
      shippingAddress: { line: `${Math.floor(rand() * 200) + 1}, MG Road`, city: weightedCity(), pincode: String(500000 + Math.floor(rand() * 99999)) },
      createdAt: created
    });
  }
  orders.sort((a, b) => a.createdAt - b.createdAt);

  for (const p of pdocs) {
    p.sold = soldBySku[p.sku] || 0;
    p.stock = Math.max(p.stock - p.sold, 15); // keep stock realistic but never zero
  }

  await db.collection('products').insertMany(pdocs);
  await db.collection('orders').insertMany(orders);

  // ---- Redis leaderboard (Sorted Set) ----
  const pipe = redis.pipeline();
  for (const [sku, qty] of Object.entries(soldBySku)) pipe.zadd(keys.leaderboard, qty, sku);
  await pipe.exec();

  console.log(`Seeded ${pdocs.length} products, ${users.length} users, ${orders.length} orders.`);
  console.log(`Leaderboard entries in Redis: ${await redis.zcard(keys.leaderboard)}`);
  console.log('Demo login -> demo@nuvora.com / demo123');
  await close();
})().catch(async (e) => { console.error(e); await close(); process.exit(1); });

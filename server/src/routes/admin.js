const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb, redis } = require('../db');
const keys = require('../keys');
const { requireRole } = require('../middleware/session');
const router = express.Router();
router.use(requireRole('admin'));
const clean = (v, max = 180) => String(v ?? '').trim().slice(0, max);
const number = (v) => Number(v);
const invalidateAnalytics = async () => { const stale = await redis.keys(keys.cache('*')); if (stale.length) await redis.del(stale); };

router.get('/overview', async (req, res) => {
  const db = getDb();
  const [products, orders, customers, revenue, recentOrders, lowStock] = await Promise.all([
    db.collection('products').countDocuments(), db.collection('orders').countDocuments(),
    db.collection('users').countDocuments({ role: 'customer' }),
    db.collection('orders').aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]).toArray(),
    db.collection('orders').find({}).sort({ createdAt: -1 }).limit(6).toArray(),
    db.collection('products').find({ stock: { $lte: 5 } }).sort({ stock: 1 }).limit(6).toArray()
  ]);
  res.set('Cache-Control', 'no-store').json({ products, orders, customers, revenue: revenue[0]?.total || 0, recentOrders, lowStock });
});
router.get('/products', async (req, res) => {
  const { q = '', category = 'All' } = req.query;
  const filter = {};
  if (category && category !== 'All') filter.category = category;
  if (q) filter.$or = [{ title: { $regex: clean(q), $options: 'i' } }, { sku: { $regex: clean(q), $options: 'i' } }, { brand: { $regex: clean(q), $options: 'i' } }];
  const items = await getDb().collection('products').find(filter).sort({ createdAt: -1, title: 1 }).limit(500).toArray();
  res.json({ items });
});
router.post('/products', async (req, res) => {
  const b = req.body || {};
  const sku = clean(b.sku, 60).toUpperCase(), title = clean(b.title), category = clean(b.category, 80);
  const price = number(b.price), stock = number(b.stock);
  if (!sku || !title || !category || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) return res.status(400).json({ error: 'SKU, title, category, valid price and non-negative stock are required.' });
  const doc = { sku, title, category, price, stock, brand: clean(b.brand, 100), description: clean(b.description, 1200), emoji: clean(b.emoji, 8) || '📦', rating: 0, reviews: 0, sold: 0, createdAt: new Date() };
  try { const result = await getDb().collection('products').insertOne(doc); doc._id = result.insertedId; res.status(201).json({ item: doc }); }
  catch (e) { if (e.code === 11000) return res.status(409).json({ error: 'That SKU already exists.' }); throw e; }
});
router.patch('/products/:sku', async (req, res) => {
  const b = req.body || {}, update = {};
  for (const k of ['title', 'category', 'brand', 'description', 'emoji']) if (b[k] !== undefined) update[k] = clean(b[k], k === 'description' ? 1200 : 180);
  if (b.price !== undefined) { update.price = number(b.price); if (!Number.isFinite(update.price) || update.price <= 0) return res.status(400).json({ error: 'Price must be greater than zero.' }); }
  if (b.stock !== undefined) { update.stock = number(b.stock); if (!Number.isInteger(update.stock) || update.stock < 0) return res.status(400).json({ error: 'Stock must be a non-negative whole number.' }); }
  if (!Object.keys(update).length) return res.status(400).json({ error: 'No product changes supplied.' });
  const result = await getDb().collection('products').findOneAndUpdate({ sku: req.params.sku }, { $set: update }, { returnDocument: 'after' });
  if (!result) return res.status(404).json({ error: 'Product not found.' });
  res.json({ item: result });
});
router.delete('/products/:sku', async (req, res) => {
  const result = await getDb().collection('products').deleteOne({ sku: req.params.sku });
  if (!result.deletedCount) return res.status(404).json({ error: 'Product not found.' });
  res.json({ ok: true });
});
router.get('/orders', async (req, res) => {
  const { status = 'All', q = '' } = req.query;
  const filter = {};
  if (status && status !== 'All') filter.status = status;
  if (q) { const s = clean(q); filter.$or = [{ orderNo: { $regex: s, $options: 'i' } }, { customerName: { $regex: s, $options: 'i' } }, { 'shippingAddress.city': { $regex: s, $options: 'i' } }]; }
  const items = await getDb().collection('orders').find(filter).sort({ createdAt: -1 }).limit(500).toArray();
  res.set('Cache-Control', 'no-store').json({ items });
});
router.patch('/orders/:id/status', async (req, res) => {
  const allowed = ['Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
  const status = clean(req.body?.status, 30);
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid order status.' });
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid order ID.' });
  const result = await getDb().collection('orders').findOneAndUpdate({ _id: new ObjectId(req.params.id) }, { $set: { status, updatedAt: new Date() } }, { returnDocument: 'after' });
  if (!result) return res.status(404).json({ error: 'Order not found.' });
  await invalidateAnalytics();
  res.json({ order: result });
});
module.exports = router;

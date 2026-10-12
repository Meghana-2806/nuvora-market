const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb, redis } = require('../db');
const keys = require('../keys');
const { requireRole } = require('../middleware/session');
const { buildCart } = require('./cart');

const router = express.Router();

const orderNumber = () => 'NV-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 90 + 10);

// POST /api/orders  -> checkout: Redis cart -> MongoDB order
router.post('/', requireRole('customer'), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const { address, paymentMethod = 'COD', coupon } = req.body || {};
  if (!address || !address.line || !address.city || !address.pincode) {
    return res.status(400).json({ error: 'Complete delivery address is required.' });
  }

  const cart = await buildCart(req.sid, coupon);
  if (!cart.lines.length) return res.status(400).json({ error: 'Your cart is empty.' });

  const products = getDb().collection('products');
  const reserved = [];

  // 1) Atomically reserve stock (filter on stock >= qty prevents overselling)
  for (const line of cart.lines) {
    const r = await products.updateOne(
      { sku: line.sku, stock: { $gte: line.qty } },
      { $inc: { stock: -line.qty, sold: line.qty } }
    );
    if (r.modifiedCount !== 1) {
      // roll back what we've reserved so far
      for (const done of reserved) {
        await products.updateOne({ sku: done.sku }, { $inc: { stock: done.qty, sold: -done.qty } });
      }
      return res.status(409).json({ error: `"${line.title}" is out of stock or has insufficient quantity.` });
    }
    reserved.push(line);
  }

  // 2) Persist the order (price snapshot per item)
  const order = {
    orderNo: orderNumber(),
    userId: new ObjectId(req.session.userId),
    customerName: req.session.name,
    items: cart.lines.map((l) => ({
      sku: l.sku, title: l.title, category: l.category, emoji: l.emoji, price: l.price, qty: l.qty
    })),
    subtotal: cart.subtotal,
    discount: cart.discount,
    shipping: cart.shipping,
    gst: cart.gst,
    total: cart.total,
    coupon: cart.coupon ? cart.coupon.code : null,
    paymentMethod,
    status: 'Placed',
    shippingAddress: {
      line: String(address.line).trim(),
      city: String(address.city).trim(),
      pincode: String(address.pincode).trim()
    },
    createdAt: new Date()
  };
  await getDb().collection('orders').insertOne(order);

  // 3) Redis: bump the Sorted Set leaderboard, clear cart, invalidate analytics cache
  const pipe = redis.pipeline();
  for (const line of cart.lines) pipe.zincrby(keys.leaderboard, line.qty, line.sku);
  pipe.del(keys.cart(req.sid));
  await pipe.exec();
  const stale = await redis.keys(keys.cache('*'));
  if (stale.length) await redis.del(stale);

  res.status(201).json({ order });
});

// GET /api/orders/summary -> aggregate statistics for the signed-in customer only.
router.get('/summary', requireRole('customer'), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const userId = new ObjectId(req.session.userId);
  const [summary] = await getDb().collection('orders').aggregate([
    { $match: { userId } },
    { $group: { _id: null, orderCount: { $sum: 1 }, totalSpent: { $sum: '$total' }, latestOrder: { $max: '$createdAt' } } },
    { $project: { _id: 0, orderCount: 1, totalSpent: { $round: ['$totalSpent', 2] }, latestOrder: 1 } }
  ]).toArray();
  res.json(summary || { orderCount: 0, totalSpent: 0, latestOrder: null });
});

// GET /api/orders -> current user's orders only
router.get('/', requireRole('customer'), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const orders = await getDb()
    .collection('orders')
    .find({ userId: new ObjectId(req.session.userId) })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
  res.json(orders);
});

module.exports = router;

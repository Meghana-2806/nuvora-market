const express = require('express');
const { getDb, redis } = require('../db');
const keys = require('../keys');
const config = require('../config');
const { priceCart } = require('../utils/pricing');

const router = express.Router();

/** Build the cart payload from the Redis HASH (sku -> qty) + Mongo product data. */
async function buildCart(sid, couponCode) {
  const raw = await redis.hgetall(keys.cart(sid)); // { sku: "qty" }
  const skus = Object.keys(raw);
  if (!skus.length) return { lines: [], ...priceCart([], couponCode), count: 0 };

  const products = await getDb().collection('products').find({ sku: { $in: skus } }).toArray();
  const bySku = Object.fromEntries(products.map((p) => [p.sku, p]));

  const lines = skus
    .filter((s) => bySku[s])
    .map((s) => {
      const p = bySku[s];
      return {
        sku: s,
        title: p.title,
        category: p.category,
        price: p.price,
        mrp: p.mrp,
        emoji: p.emoji,
        stock: p.stock,
        qty: parseInt(raw[s], 10)
      };
    });

  const count = lines.reduce((n, l) => n + l.qty, 0);
  return { lines, count, ...priceCart(lines, couponCode) };
}

router.get('/', async (req, res) => {
  res.json(await buildCart(req.sid, req.query.coupon));
});

// POST /api/cart  { sku, qty }  -> HINCRBY
router.post('/', async (req, res) => {
  const { sku } = req.body || {};
  const qty = Math.max(1, parseInt(req.body.qty || 1, 10));
  const product = await getDb().collection('products').findOne({ sku });
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const current = parseInt((await redis.hget(keys.cart(req.sid), sku)) || '0', 10);
  if (current + qty > Math.min(product.stock, 10)) {
    return res.status(400).json({ error: `Only ${Math.min(product.stock, 10)} unit(s) can be added for this item.` });
  }
  await redis.hincrby(keys.cart(req.sid), sku, qty);
  await redis.expire(keys.cart(req.sid), config.sessionTtl);
  res.json(await buildCart(req.sid));
});

// PUT /api/cart/:sku { qty } -> HSET (qty 0 removes)
router.put('/:sku', async (req, res) => {
  const qty = parseInt(req.body.qty, 10);
  if (Number.isNaN(qty) || qty < 0) return res.status(400).json({ error: 'Invalid quantity.' });
  if (qty === 0) {
    await redis.hdel(keys.cart(req.sid), req.params.sku);
  } else {
    const product = await getDb().collection('products').findOne({ sku: req.params.sku });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    if (qty > Math.min(product.stock, 10)) {
      return res.status(400).json({ error: `Maximum ${Math.min(product.stock, 10)} unit(s) allowed.` });
    }
    await redis.hset(keys.cart(req.sid), req.params.sku, qty);
  }
  res.json(await buildCart(req.sid));
});

router.delete('/:sku', async (req, res) => {
  await redis.hdel(keys.cart(req.sid), req.params.sku);
  res.json(await buildCart(req.sid));
});

router.delete('/', async (req, res) => {
  await redis.del(keys.cart(req.sid));
  res.json(await buildCart(req.sid));
});

module.exports = router;
module.exports.buildCart = buildCart;

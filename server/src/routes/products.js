const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

// GET /api/products?q=&category=&min=&max=&sort=&page=&limit=
router.get('/', async (req, res) => {
  const { q, category, min, max, sort = 'featured', page = 1, limit = 12 } = req.query;
  const filter = {};

  if (q) filter.$text = { $search: String(q) };
  if (category && category !== 'All') filter.category = category;
  if (min || max) {
    filter.price = {};
    if (min) filter.price.$gte = Number(min);
    if (max) filter.price.$lte = Number(max);
  }

  const sorts = {
    featured: { rating: -1, reviews: -1 },
    'price-asc': { price: 1 },
    'price-desc': { price: -1 },
    rating: { rating: -1 },
    newest: { createdAt: -1 }
  };

  const l = Math.min(parseInt(limit, 10) || 12, 48);
  const p = Math.max(parseInt(page, 10) || 1, 1);
  const col = getDb().collection('products');

  const [items, total] = await Promise.all([
    col.find(filter).sort(sorts[sort] || sorts.featured).skip((p - 1) * l).limit(l).toArray(),
    col.countDocuments(filter)
  ]);

  res.json({ items, total, page: p, pages: Math.ceil(total / l) });
});

router.get('/categories', async (req, res) => {
  const cats = await getDb()
    .collection('products')
    .aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
    .toArray();
  res.json(cats.map((c) => ({ name: c._id, count: c.count })));
});

router.get('/:sku', async (req, res) => {
  const p = await getDb().collection('products').findOne({ sku: req.params.sku });
  if (!p) return res.status(404).json({ error: 'Product not found.' });
  res.json(p);
});

module.exports = router;

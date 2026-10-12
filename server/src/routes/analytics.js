const express = require('express');
const { requireRole } = require('../middleware/session');
const { getDb, redis } = require('../db');
const keys = require('../keys');
const config = require('../config');

const router = express.Router();
router.use((req, res, next) => {
  // Product discovery uses the public leaderboard; all sales/customer analytics are admin-only.
  if (req.path === '/leaderboard') return next();
  return requireRole('admin')(req, res, next);
});

/** Read-through cache in Redis (short TTL, cleared whenever an order is placed). */
async function cached(name, compute) {
  const key = keys.cache(name);
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);
  const data = await compute();
  await redis.set(key, JSON.stringify(data), 'EX', config.analyticsCacheTtl);
  return data;
}

const orders = () => getDb().collection('orders');

// KPI cards
router.get('/summary', async (req, res) => {
  res.json(
    await cached('summary', async () => {
      const [r] = await orders()
        .aggregate([
          {
            $group: {
              _id: null,
              revenue: { $sum: '$total' },
              orders: { $sum: 1 },
              units: { $sum: { $sum: '$items.qty' } },
              customers: { $addToSet: '$userId' }
            }
          },
          {
            $project: {
              _id: 0,
              revenue: { $round: ['$revenue', 0] },
              orders: 1,
              units: 1,
              customers: { $size: '$customers' },
              avgOrderValue: { $round: [{ $divide: ['$revenue', '$orders'] }, 0] }
            }
          }
        ])
        .toArray();
      return r || { revenue: 0, orders: 0, units: 0, customers: 0, avgOrderValue: 0 };
    })
  );
});

// Sales analytics by CATEGORY  ($unwind items -> $group by items.category)
router.get('/by-category', async (req, res) => {
  res.json(
    await cached('by-category', () =>
      orders()
        .aggregate([
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.category',
              revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
              units: { $sum: '$items.qty' },
              orders: { $addToSet: '$_id' }
            }
          },
          {
            $project: {
              _id: 0,
              category: '$_id',
              revenue: { $round: ['$revenue', 0] },
              units: 1,
              orders: { $size: '$orders' }
            }
          },
          { $sort: { revenue: -1 } }
        ])
        .toArray()
    )
  );
});

// Sales analytics by CITY  ($group by shippingAddress.city)
router.get('/by-city', async (req, res) => {
  res.json(
    await cached('by-city', () =>
      orders()
        .aggregate([
          {
            $group: {
              _id: '$shippingAddress.city',
              revenue: { $sum: '$total' },
              orders: { $sum: 1 },
              units: { $sum: { $sum: '$items.qty' } }
            }
          },
          {
            $project: {
              _id: 0,
              city: '$_id',
              revenue: { $round: ['$revenue', 0] },
              orders: 1,
              units: 1,
              avgOrderValue: { $round: [{ $divide: ['$revenue', '$orders'] }, 0] }
            }
          },
          { $sort: { revenue: -1 } }
        ])
        .toArray()
    )
  );
});

// Category x City revenue matrix
router.get('/category-city', async (req, res) => {
  res.json(
    await cached('category-city', () =>
      orders()
        .aggregate([
          { $unwind: '$items' },
          {
            $group: {
              _id: { category: '$items.category', city: '$shippingAddress.city' },
              revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } }
            }
          },
          {
            $project: { _id: 0, category: '$_id.category', city: '$_id.city', revenue: { $round: ['$revenue', 0] } }
          },
          { $sort: { category: 1, city: 1 } }
        ])
        .toArray()
    )
  );
});

// Daily revenue trend, last 14 days
router.get('/trend', async (req, res) => {
  res.json(
    await cached('trend', () => {
      const since = new Date(Date.now() - 14 * 24 * 3600 * 1000);
      return orders()
        .aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              revenue: { $sum: '$total' },
              orders: { $sum: 1 }
            }
          },
          { $project: { _id: 0, date: '$_id', revenue: { $round: ['$revenue', 0] }, orders: 1 } },
          { $sort: { date: 1 } }
        ])
        .toArray();
    })
  );
});

// Leaderboard: Redis ZSET (ZREVRANGE ... WITHSCORES) enriched from MongoDB
router.get('/leaderboard', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '10', 10), 25);
  const flat = await redis.zrevrange(keys.leaderboard, 0, limit - 1, 'WITHSCORES');
  const entries = [];
  for (let i = 0; i < flat.length; i += 2) entries.push({ sku: flat[i], sold: parseInt(flat[i + 1], 10) });

  const products = await getDb()
    .collection('products')
    .find({ sku: { $in: entries.map((e) => e.sku) } })
    .toArray();
  const bySku = Object.fromEntries(products.map((p) => [p.sku, p]));

  res.json(
    entries
      .filter((e) => bySku[e.sku])
      .map((e, i) => ({
        rank: i + 1,
        sku: e.sku,
        sold: e.sold,
        title: bySku[e.sku].title,
        category: bySku[e.sku].category,
        price: bySku[e.sku].price,
        emoji: bySku[e.sku].emoji
      }))
  );
});

module.exports = router;

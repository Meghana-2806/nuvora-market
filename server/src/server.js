const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const config = require('./config');
const { connectMongo, ensureIndexes, redis } = require('./db');
const { session } = require('./middleware/session');

const app = express();
app.use(express.json());
app.use(cookieParser());
// Load the Redis-backed session before serving pages so private dashboards are
// protected on the server, not only hidden by frontend JavaScript.
app.use(session);

app.get('/dashboard.html', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!req.session.userId) return res.redirect('/?next=admin');
  if (req.session.role !== 'admin') return res.status(403).send('Access denied. Administrator accounts only. <a href="/">Return to Nuvora</a>');
  next();
});
app.get('/customer-dashboard.html', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!req.session.userId) return res.redirect('/?next=customer');
  if (req.session.role !== 'customer') return res.status(403).send('Access denied. Customer accounts only. <a href="/">Return to Nuvora</a>');
  next();
});
app.get('/orders.html', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!req.session.userId) return res.redirect('/?next=customer');
  if (req.session.role !== 'customer') return res.status(403).send('Access denied. Customer accounts only. <a href="/">Return to Nuvora</a>');
  next();
});

app.use(express.static(path.join(__dirname, '..', '..', 'client')));

const wrap = require('./utils/asyncRoutes');
app.use('/api/auth', wrap(require('./routes/auth')));
app.use('/api/products', wrap(require('./routes/products')));
app.use('/api/cart', wrap(require('./routes/cart')));
app.use('/api/orders', wrap(require('./routes/orders')));
app.use('/api/analytics', wrap(require('./routes/analytics')));
app.use('/api/admin', wrap(require('./routes/admin')));

app.get('/api/health', async (req, res) => {
  let redisOk = false;
  try { redisOk = (await redis.ping()) === 'PONG'; } catch (_) { /* ignore */ }
  res.json({ status: 'ok', mongo: true, redis: redisOk, time: new Date().toISOString() });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

(async () => {
  try {
    await connectMongo();
    await ensureIndexes();
    app.listen(config.port, () => {
      console.log(`Nuvora running -> http://localhost:${config.port}`);
    });
  } catch (err) {
    console.error('Startup failed:', err.message);
    process.exit(1);
  }
})();

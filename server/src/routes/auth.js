const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb, redis } = require('../db');
const keys = require('../keys');
const config = require('../config');
const { hashPassword, verifyPassword } = require('../utils/password');

const router = express.Router();
const publicUser = (u) => ({ id: String(u._id), name: u.name, email: u.email, city: u.city || '', role: u.role || 'customer' });

async function startSession(req, res, user) {
  // Regenerate the session id after authentication to avoid session fixation.
  const crypto = require('crypto');
  const oldSid = req.sid;
  const nextSid = crypto.randomUUID();
  await redis.del(keys.session(oldSid));
  const cartExists = await redis.exists(keys.cart(oldSid));
  if (cartExists) await redis.rename(keys.cart(oldSid), keys.cart(nextSid));
  req.sid = nextSid;
  await redis.hset(keys.session(req.sid), {
    role: user.role || 'customer', userId: String(user._id), name: user.name,
    email: user.email, city: user.city || ''
  });
  await redis.expire(keys.session(req.sid), config.sessionTtl);
  res.cookie('sid', req.sid, { httpOnly: true, sameSite: 'lax', maxAge: config.sessionTtl * 1000 });
}

router.post('/register', async (req, res) => {
  const { name, email, password, city = '', accountType = 'customer', setupKey = '' } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required.' });
  if (String(password).length < 8) return res.status(400).json({ error: 'Use a password with at least 8 characters.' });
  if (!['customer', 'admin'].includes(accountType)) return res.status(400).json({ error: 'Invalid account type.' });
  if (accountType === 'admin' && (!config.adminSetupKey || setupKey !== config.adminSetupKey)) {
    return res.status(403).json({ error: 'Admin registration requires the valid admin setup key configured by the project owner.' });
  }
  const normalizedEmail = String(email).toLowerCase().trim();
  const users = getDb().collection('users');
  const exists = await users.findOne({ email: normalizedEmail });
  if (exists) return res.status(409).json({ error: 'An account with this email already exists.' });
  const doc = { name: String(name).trim(), email: normalizedEmail, passwordHash: hashPassword(String(password)), city: String(city).trim(), role: accountType, createdAt: new Date() };
  const { insertedId } = await users.insertOne(doc);
  doc._id = insertedId;
  await startSession(req, res, doc);
  res.status(201).json({ user: publicUser(doc) });
});

router.post('/login', async (req, res) => {
  const { email, password, accountType = 'customer' } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  if (!['customer', 'admin'].includes(accountType)) return res.status(400).json({ error: 'Invalid account type.' });
  const user = await getDb().collection('users').findOne({ email: String(email).toLowerCase().trim() });
  if (!user || !verifyPassword(String(password), user.passwordHash) || (user.role || 'customer') !== accountType) {
    return res.status(401).json({ error: `Invalid ${accountType === 'admin' ? 'admin' : 'customer'} credentials.` });
  }
  await startSession(req, res, user);
  res.json({ user: publicUser(user) });
});

router.post('/logout', async (req, res) => {
  await redis.del(keys.session(req.sid), keys.cart(req.sid));
  res.clearCookie('sid');
  res.json({ ok: true });
});

router.get('/me', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!req.session.userId) return res.json({ user: null });
  const user = await getDb().collection('users').findOne({ _id: new ObjectId(req.session.userId) });
  res.json({ user: user ? publicUser(user) : null });
});
module.exports = router;

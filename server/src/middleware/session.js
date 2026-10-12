const crypto = require('crypto');
const { redis } = require('../db');
const config = require('../config');
const keys = require('../keys');

/**
 * Redis-backed session middleware.
 * - Session id lives in an httpOnly cookie.
 * - Session data lives in a Redis HASH with a sliding TTL.
 * - The shopping cart (another HASH) shares the same sid and TTL.
 */
async function session(req, res, next) {
  try {
    let sid = req.cookies.sid;
    let data = sid ? await redis.hgetall(keys.session(sid)) : {};

    if (!sid || Object.keys(data).length === 0) {
      sid = crypto.randomUUID();
      data = { role: 'guest', createdAt: String(Date.now()) };
      await redis.hset(keys.session(sid), data);
    }

    // sliding expiration for session + cart
    await redis.expire(keys.session(sid), config.sessionTtl);
    await redis.expire(keys.cart(sid), config.sessionTtl);

    res.cookie('sid', sid, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: config.sessionTtl * 1000
    });

    req.sid = sid;
    req.session = data;
    next();
  } catch (err) {
    next(err);
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Please sign in to continue.' });
    if ((req.session.role || 'customer') !== role) return res.status(403).json({ error: 'You do not have permission to access this resource.' });
    next();
  };
}

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }
  next();
}

module.exports = { session, requireAuth, requireRole };

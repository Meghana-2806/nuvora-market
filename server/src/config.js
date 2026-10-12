require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017',
  mongoDb: process.env.MONGO_DB || 'nuvora',
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  sessionTtl: parseInt(process.env.SESSION_TTL_SECONDS || '7200', 10),
  adminSetupKey: process.env.ADMIN_SETUP_KEY || '',
  analyticsCacheTtl: 30, // seconds
  freeShippingAbove: 499,
  shippingFee: 40,
  gstRate: 0.18,
  coupons: {
    SAVE10: { type: 'percent', value: 10, min: 0, label: '10% off your order' },
    WELCOME100: { type: 'flat', value: 100, min: 999, label: '₹100 off on orders above ₹999' },
    FREESHIP: { type: 'shipping', value: 0, min: 0, label: 'Free shipping' }
  }
};

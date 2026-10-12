// Central place for every Redis key used by the app.
module.exports = {
  session: (sid) => `session:${sid}`,         // HASH  -> session data (userId, name, city ...)
  cart: (sid) => `cart:${sid}`,               // HASH  -> field = sku, value = quantity
  leaderboard: 'leaderboard:top_products',    // ZSET  -> member = sku, score = units sold
  cache: (name) => `cache:analytics:${name}`  // STRING (JSON) with short TTL
};

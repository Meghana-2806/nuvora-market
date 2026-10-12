/**
 * Express 4 does not forward rejected promises from async handlers to the
 * error middleware. This wraps every route handler of a router so that
 * `throw`/rejections reach `next(err)` without extra dependencies.
 */
module.exports = function asyncRoutes(router) {
  router.stack.forEach((layer) => {
    if (!layer.route) return;
    layer.route.stack.forEach((l) => {
      const fn = l.handle;
      if (fn.length <= 3) {
        l.handle = (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
      }
    });
  });
  return router;
};

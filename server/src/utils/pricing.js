const config = require('../config');

const round = (n) => Math.round(n * 100) / 100;

/**
 * Price a list of cart lines: subtotal, coupon discount, shipping, GST, total.
 * lines: [{ price, qty }]
 */
function priceCart(lines, couponCode) {
  const subtotal = round(lines.reduce((s, l) => s + l.price * l.qty, 0));
  let discount = 0;
  let shippingFree = subtotal >= config.freeShippingAbove || subtotal === 0;
  let coupon = null;

  const def = couponCode ? config.coupons[String(couponCode).toUpperCase()] : null;
  if (def && subtotal >= def.min && subtotal > 0) {
    coupon = { code: String(couponCode).toUpperCase(), label: def.label };
    if (def.type === 'percent') discount = round((subtotal * def.value) / 100);
    if (def.type === 'flat') discount = def.value;
    if (def.type === 'shipping') shippingFree = true;
  }

  const shipping = shippingFree ? 0 : config.shippingFee;
  const taxable = Math.max(subtotal - discount, 0);
  const gst = round(taxable * config.gstRate);
  const total = round(taxable + gst + shipping);

  return { subtotal, discount, shipping, gst, total, coupon, couponInvalid: Boolean(couponCode && !coupon) };
}

module.exports = { priceCart };

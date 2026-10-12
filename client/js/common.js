/* Nuvora shared UI: header, cart drawer, auth + checkout modals, helpers. */
const CITIES = ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Vijayawada'];
const CATEGORIES = ['Electronics', 'Fashion', 'Home & Kitchen', 'Books', 'Beauty', 'Sports & Fitness', 'Toys', 'Grocery'];

const SS = {
  user: null,
  cart: { lines: [], count: 0 },
  coupon: '',
  onCartChange: [],

  inr: (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 }),
  inr2: (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  esc: (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  $: (sel, root = document) => root.querySelector(sel),

  async api(path, opts = {}) {
    const res = await fetch('/api' + path, {
      method: opts.method || 'GET',
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: 'same-origin'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(data.error || 'Request failed'); e.status = res.status; throw e; }
    return data;
  },

  toast(msg, isErr) {
    let box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast' + (isErr ? ' err' : '');
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.remove(), 2800);
  },

  tile(p, extra = '') {
    return `<div class="tile" style="background:linear-gradient(135deg,${p.grad ? p.grad[0] : '#334155'},${p.grad ? p.grad[1] : '#64748b'})" ${extra}>${p.emoji || '📦'}</div>`;
  },
  gradFor(cat) {
    const g = {
      Electronics: ['#1e3a8a', '#3b82f6'], Fashion: ['#9d174d', '#ec4899'], 'Home & Kitchen': ['#92400e', '#f59e0b'],
      Books: ['#115e59', '#14b8a6'], Beauty: ['#6b21a8', '#c084fc'], 'Sports & Fitness': ['#166534', '#4ade80'],
      Toys: ['#b91c1c', '#fb923c'], Grocery: ['#3f6212', '#a3e635']
    };
    return g[cat] || ['#334155', '#64748b'];
  },
  stars(r) {
    const full = Math.round(r);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  },

  /* ---------------- layout ---------------- */
  mountLayout(active) {
    const path = location.pathname;
    document.body.insertAdjacentHTML('afterbegin', `
      <header class="nav">
        <div class="container nav-top">
          <a href="/shop.html" class="logo"><span class="brand-mark">N</span><span class="brand-word">Nuvo<span>ra</span></span></a>
          <div class="deliver">A better way to shop<b id="deliverCity">India, delivered</b></div>
          <form class="search" id="searchForm">
            <select id="searchCat"><option>All</option>${CATEGORIES.map((c) => `<option>${c}</option>`).join('')}</select>
            <input id="searchInput" placeholder="Search Nuvora — phones, books, kitchen..." autocomplete="off">
            <button type="submit" aria-label="Search">🔍</button>
          </form>
          <button class="nav-link" id="accountBtn"><small>Hello, sign in</small><b>Account ▾</b></button>
          <a id="ordersNavLink" href="/orders.html" class="nav-link hide-sm" hidden><small>Returns</small><b>& Orders</b></a>
          <button class="cart-btn" id="cartBtn"><span aria-hidden="true">Bag</span> <span class="count" id="cartCount">0</span></button>
        </div>
        <div class="nav-sub"><div class="container">
          <a href="/shop.html" class="${path.endsWith('shop.html') ? 'active' : ''}">☰ All Products</a>
          ${['Electronics', 'Fashion', 'Home & Kitchen', 'Books', 'Beauty', 'Grocery'].map((c) => `<a href="/shop.html?category=${encodeURIComponent(c)}">${c}</a>`).join('')}
          <a id="workspaceLink" href="/customer-dashboard.html" hidden>My Dashboard</a>
          <span class="spacer"></span>
          <span class="pill-live" id="healthPill">connecting…</span>
        </div></div>
      </header>

      <div class="overlay" id="overlay"></div>

      <aside class="drawer" id="drawer" aria-label="Shopping cart">
        <div class="drawer-head"><h3>🛒 Shopping Cart</h3><button class="x" data-close>&times;</button></div>
        <div class="drawer-body" id="drawerBody"></div>
        <div class="drawer-foot" id="drawerFoot"></div>
      </aside>

      <div class="modal" id="authModal">
        <button class="x" data-close>&times;</button>
        <h2>Welcome back</h2><p class="sub">Sign in to checkout and track orders.</p>
        <div class="tabs"><button class="on" data-tab="login">Sign in</button><button data-tab="register">Create account</button></div>
        <div class="err-msg" id="authErr"></div>
        <form id="loginForm">
          <div class="field"><label>Email</label><input type="email" name="email" value="demo@nuvora.com" required></div>
          <div class="field"><label>Password</label><input type="password" name="password" value="demo123" minlength="8" required></div>
          <button class="btn block" type="submit">Sign in</button>
          <p class="hint" style="margin-top:10px">Demo account is pre-filled: demo@nuvora.com / demo123</p>
        </form>
        <form id="registerForm" style="display:none">
          <div class="field"><label>Full name</label><input name="name" required></div>
          <div class="field"><label>Email</label><input type="email" name="email" required></div>
          <div class="two">
            <div class="field"><label>Password</label><input type="password" name="password" minlength="6" required></div>
            <div class="field"><label>City</label><select name="city">${CITIES.map((c) => `<option>${c}</option>`).join('')}</select></div>
          </div>
          <button class="btn block" type="submit">Create your account</button>
        </form>
      </div>

      <div class="modal" id="checkoutModal"><button class="x" data-close>&times;</button><div id="checkoutInner"></div></div>
      <div class="modal wide" id="productModal"><button class="x" data-close>&times;</button><div id="productInner"></div></div>
    `);

    document.body.insertAdjacentHTML('beforeend', `
      <footer><div class="container">
        <div><h5>Nuvora<span style="color:var(--orange)">.</span></h5><p style="font-size:13px;color:#bbb;max-width:340px">A modern e-commerce platform for discovering products, managing carts, and tracking orders.</p></div>
        <div><h5>Shop</h5><a href="/shop.html">All products</a><a href="/shop.html?category=Electronics">Electronics</a><a href="/shop.html?category=Books">Books</a></div>
        <div><h5>Account</h5><a id="footerOrdersLink" href="/orders.html">Your orders</a><a id="footerWorkspaceLink" href="/customer-dashboard.html">My dashboard</a></div>
        <div><h5>Tech</h5><a href="/api/health" target="_blank">API health</a><a href="/api/analytics/leaderboard" target="_blank">Leaderboard API</a></div>
      </div><div class="copy">© 2026 Nuvora Technologies • All rights reserved</div></footer>`);

    // events
    const $ = SS.$;
    $('#cartBtn').onclick = () => SS.openDrawer();
    document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = SS.closeAll));
    $('#overlay').onclick = SS.closeAll;
    $('#accountBtn').onclick = () => (SS.user ? SS.accountMenu() : SS.openModal('authModal'));
    $('#searchForm').onsubmit = (e) => {
      e.preventDefault();
      const q = $('#searchInput').value.trim();
      const c = $('#searchCat').value;
      const p = new URLSearchParams();
      if (q) p.set('q', q);
      if (c !== 'All') p.set('category', c);
      location.href = '/shop.html?' + p.toString();
    };
    const qs = new URLSearchParams(location.search);
    if (qs.get('q')) $('#searchInput').value = qs.get('q');
    if (qs.get('category')) $('#searchCat').value = qs.get('category');

    // auth tabs
    document.querySelectorAll('#authModal .tabs button').forEach((b) => {
      b.onclick = () => {
        document.querySelectorAll('#authModal .tabs button').forEach((x) => x.classList.toggle('on', x === b));
        $('#loginForm').style.display = b.dataset.tab === 'login' ? '' : 'none';
        $('#registerForm').style.display = b.dataset.tab === 'register' ? '' : 'none';
        $('#authErr').style.display = 'none';
      };
    });
    $('#loginForm').onsubmit = (e) => SS.submitAuth(e, '/auth/login');
    $('#registerForm').onsubmit = (e) => SS.submitAuth(e, '/auth/register');

    SS.init();
  },

  async init() {
    try { const { user } = await SS.api('/auth/me'); SS.setUser(user);
      if (location.pathname === '/dashboard.html' && (!user || user.role !== 'admin')) { location.replace('/'); return; }
      if (location.pathname === '/customer-dashboard.html' && (!user || user.role !== 'customer')) { location.replace('/'); return; }
    } catch (_) { if (location.pathname.includes('dashboard')) { location.replace('/'); return; } }
    await SS.refreshCart();
    SS.health();
  },

  async health() {
    const pill = SS.$('#healthPill');
    try {
      const h = await SS.api('/health');
      pill.textContent = h.redis ? 'All services connected' : 'Service connection issue';
    } catch (_) { pill.textContent = 'API offline'; pill.style.color = '#fca5a5'; }
  },

  setUser(user) {
    SS.user = user;
    const btn = SS.$('#accountBtn');
    btn.innerHTML = user ? `<small>Hello, ${SS.esc(user.name.split(' ')[0])}</small><b>Account ▾</b>` : '<small>Hello, sign in</small><b>Account ▾</b>';
    SS.$('#deliverCity').textContent = '📍 ' + (user ? user.city : 'India');
    const workspace = SS.$('#workspaceLink');
    const footerWorkspace = SS.$('#footerWorkspaceLink');
    const ordersLink = SS.$('#ordersNavLink');
    const footerOrders = SS.$('#footerOrdersLink');
    if (ordersLink) ordersLink.hidden = !user || user.role !== 'customer';
    if (footerOrders) footerOrders.hidden = !user || user.role !== 'customer';
    if (workspace) {
      workspace.hidden = !user;
      workspace.href = user && user.role === 'admin' ? '/dashboard.html' : '/customer-dashboard.html';
      workspace.textContent = user && user.role === 'admin' ? '▦ Admin Analytics' : 'My Dashboard';
      workspace.classList.toggle('active', location.pathname.includes('dashboard'));
    }
    if (footerWorkspace && user) {
      footerWorkspace.href = user.role === 'admin' ? '/dashboard.html' : '/customer-dashboard.html';
      footerWorkspace.textContent = user.role === 'admin' ? 'Admin analytics' : 'My dashboard';
    } else if (footerWorkspace) footerWorkspace.hidden = true;
  },

  async submitAuth(e, url) {
    e.preventDefault();
    const err = SS.$('#authErr');
    err.style.display = 'none';
    try {
      const body = Object.fromEntries(new FormData(e.target));
      const { user } = await SS.api(url, { method: 'POST', body });
      SS.setUser(user);
      SS.closeAll();
      SS.toast(`Welcome, ${user.name.split(' ')[0]}! 🎉`);
      if (SS.afterLogin) { const f = SS.afterLogin; SS.afterLogin = null; f(); }
      if (typeof window.onAuthChange === 'function') window.onAuthChange();
    } catch (ex) { err.textContent = ex.message; err.style.display = 'block'; }
  },

  accountMenu() {
    if (confirm(`Signed in as ${SS.user.name} (${SS.user.email}).\n\nSign out? Your session and cart will be cleared.`)) {
      // Always return to the main login page after a sign-out attempt.
      // The server invalidates the session; the redirect also clears any role-specific UI.
      SS.api('/auth/logout', { method: 'POST' })
        .catch(() => {})
        .finally(() => location.replace('/'));
    }
  },

  /* ---------------- modals ---------------- */
  openModal(id) { SS.closeAll(); SS.$('#' + id).classList.add('open'); SS.$('#overlay').classList.add('open'); },
  closeAll() {
    document.querySelectorAll('.modal.open, .drawer.open, .overlay.open').forEach((el) => el.classList.remove('open'));
  },
  openDrawer() { SS.closeAll(); SS.$('#drawer').classList.add('open'); SS.$('#overlay').classList.add('open'); SS.refreshCart(); },

  /* ---------------- cart ---------------- */
  async refreshCart() {
    try { SS.cart = await SS.api('/cart' + (SS.coupon ? '?coupon=' + encodeURIComponent(SS.coupon) : '')); } catch (_) { return; }
    SS.renderCart();
  },

  async addToCart(sku, qty = 1) {
    try {
      SS.cart = await SS.api('/cart', { method: 'POST', body: { sku, qty } });
      SS.cart = await SS.api('/cart' + (SS.coupon ? '?coupon=' + encodeURIComponent(SS.coupon) : ''));
      SS.renderCart();
      SS.toast('Added to cart ✔');
      const b = SS.$('#cartCount'); b.animate([{ transform: 'scale(1.5)' }, { transform: 'scale(1)' }], 250);
    } catch (e) { SS.toast(e.message, true); }
  },

  async setQty(sku, qty) {
    try {
      await SS.api('/cart/' + sku, { method: 'PUT', body: { qty } });
      await SS.refreshCart();
    } catch (e) { SS.toast(e.message, true); }
  },

  async applyCoupon() {
    SS.coupon = SS.$('#couponInput').value.trim().toUpperCase();
    await SS.refreshCart();
    if (SS.coupon && SS.cart.couponInvalid) SS.toast('Coupon not applicable for this cart', true);
  },

  renderCart() {
    const c = SS.cart;
    SS.$('#cartCount').textContent = c.count || 0;
    const body = SS.$('#drawerBody');
    const foot = SS.$('#drawerFoot');
    if (!c.lines.length) {
      body.innerHTML = `<div class="empty"><div class="em">🛒</div><h3>Your Nuvora cart is empty</h3><p>Add something awesome from the catalog.</p></div>`;
      foot.innerHTML = '';
    } else {
      body.innerHTML = c.lines.map((l) => {
        const g = SS.gradFor(l.category);
        return `<div class="line">
          <div class="th" style="background:linear-gradient(135deg,${g[0]},${g[1]})">${l.emoji}</div>
          <div class="info"><b>${SS.esc(l.title)}</b><small>${SS.inr(l.price)} each</small><br>
            <div class="qty"><button onclick="SS.setQty('${l.sku}',${l.qty - 1})">−</button><span>${l.qty}</span><button onclick="SS.setQty('${l.sku}',${l.qty + 1})">+</button></div>
            <button class="link" onclick="SS.setQty('${l.sku}',0)">Delete</button></div>
          <b>${SS.inr(l.price * l.qty)}</b></div>`;
      }).join('');
      const hint = c.shipping === 0
        ? '<div class="hint ok">✔ Your order qualifies for FREE delivery</div>'
        : `<div class="hint">Add ${SS.inr(499 - c.subtotal)} more for FREE delivery</div>`;
      foot.innerHTML = `
        ${hint}
        <div class="coupon"><input id="couponInput" placeholder="Coupon: SAVE10, WELCOME100, FREESHIP" value="${SS.esc(SS.coupon)}"><button class="btn dark" onclick="SS.applyCoupon()">Apply</button></div>
        ${c.coupon ? `<div class="hint ok">🏷️ ${SS.esc(c.coupon.code)} applied — ${SS.esc(c.coupon.label)}</div>` : ''}
        <div class="row"><span>Subtotal (${c.count} items)</span><span>${SS.inr2(c.subtotal)}</span></div>
        ${c.discount ? `<div class="row save"><span>Coupon discount</span><span>−${SS.inr2(c.discount)}</span></div>` : ''}
        <div class="row"><span>Delivery</span><span>${c.shipping ? SS.inr2(c.shipping) : 'FREE'}</span></div>
        <div class="row"><span>GST (18%)</span><span>${SS.inr2(c.gst)}</span></div>
        <div class="row total"><span>Order total</span><span>${SS.inr2(c.total)}</span></div>
        <button class="btn block" style="margin-top:12px" onclick="SS.startCheckout()">Proceed to Buy ➔</button>
        <button class="link" style="margin:10px auto 0;display:block" onclick="SS.clearCart()">Clear cart</button>`;
    }
    SS.onCartChange.forEach((f) => f());
  },

  async clearCart() { await SS.api('/cart', { method: 'DELETE' }); await SS.refreshCart(); },

  /* ---------------- checkout ---------------- */
  startCheckout() {
    if (!SS.user) { SS.afterLogin = () => SS.startCheckout(); SS.openModal('authModal'); SS.toast('Please sign in to place your order'); return; }
    const c = SS.cart;
    SS.$('#checkoutInner').innerHTML = `
      <h2>Secure checkout</h2><p class="sub">${c.count} item(s) • Total <b>${SS.inr2(c.total)}</b></p>
      <div class="err-msg" id="coErr"></div>
      <form id="coForm">
        <div class="field"><label>Delivery address</label><input name="line" placeholder="Flat / House no., Street, Area" required></div>
        <div class="two">
          <div class="field"><label>City</label><select name="city">${CITIES.map((x) => `<option ${x === SS.user.city ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
          <div class="field"><label>PIN code</label><input name="pincode" pattern="[0-9]{6}" maxlength="6" placeholder="6 digits" required></div>
        </div>
        <div class="field"><label>Payment method</label>
          <div class="pay">${['UPI', 'Card', 'NetBanking', 'COD'].map((m, i) => `<label class="${i === 0 ? 'on' : ''}"><input type="radio" name="paymentMethod" value="${m}" ${i === 0 ? 'checked' : ''}>${m === 'COD' ? 'Cash on Delivery' : m}</label>`).join('')}</div>
        </div>
        <button class="btn block" id="placeBtn" type="submit">Place your order • ${SS.inr2(c.total)}</button>
        <p class="hint" style="margin-top:8px;text-align:center">Demo checkout — no real payment is processed.</p>
      </form>`;
    SS.openModal('checkoutModal');
    document.querySelectorAll('#coForm .pay input').forEach((r) => (r.onchange = () => {
      document.querySelectorAll('#coForm .pay label').forEach((l) => l.classList.toggle('on', l.querySelector('input').checked));
    }));
    SS.$('#coForm').onsubmit = SS.placeOrder;
  },

  async placeOrder(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const btn = SS.$('#placeBtn'); btn.disabled = true; btn.textContent = 'Placing order…';
    try {
      const { order } = await SS.api('/orders', {
        method: 'POST',
        body: { address: { line: f.line, city: f.city, pincode: f.pincode }, paymentMethod: f.paymentMethod, coupon: SS.coupon || undefined }
      });
      SS.coupon = '';
      await SS.refreshCart();
      SS.$('#checkoutInner').innerHTML = `
        <div class="success"><div class="em">🎉</div><h2>Order placed successfully!</h2>
        <p class="sub">Order <b>${SS.esc(order.orderNo)}</b> • ${SS.inr2(order.total)} • delivering to ${SS.esc(order.shippingAddress.city)}</p>
        <p class="hint">Stock updated • Product rankings refreshed</p>
        <div style="display:flex;gap:10px;margin-top:18px"><a class="btn block ghost" href="/orders.html">View orders</a><button class="btn block" onclick="SS.closeAll();window.onOrderPlaced&&window.onOrderPlaced()">Continue shopping</button></div></div>`;
      if (typeof window.onOrderPlaced === 'function') window.onOrderPlaced(true);
    } catch (ex) {
      const err = SS.$('#coErr'); err.textContent = ex.message; err.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Place your order';
    }
  }
};

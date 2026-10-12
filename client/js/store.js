SS.mountLayout('home');

const qs = new URLSearchParams(location.search);
const state = {
  q: qs.get('q') || '',
  category: qs.get('category') || 'All',
  min: '', max: '', sort: 'featured', page: 1
};
let topSkus = new Set();

async function loadCategories() {
  const cats = await SS.api('/products/categories');
  const total = cats.reduce((n, c) => n + c.count, 0);
  const all = [{ name: 'All', count: total }, ...cats];
  SS.$('#catFilter').innerHTML = all.map((c) => `
    <label class="${state.category === c.name ? 'on' : ''}">
      <input type="radio" name="cat" value="${SS.esc(c.name)}"><span>${SS.esc(c.name)}</span><span>${c.count}</span>
    </label>`).join('');
  document.querySelectorAll('#catFilter input').forEach((i) => {
    i.onchange = () => { state.category = i.value; state.page = 1; loadCategories(); loadProducts(); };
  });
}

async function loadTop() {
  const top = await SS.api('/analytics/leaderboard?limit=5');
  topSkus = new Set(top.slice(0, 3).map((t) => t.sku));
  SS.$('#topStrip').innerHTML = top.map((t) => `
    <div class="top-item" onclick="showProduct('${t.sku}')">
      <span class="rank">#${t.rank}</span><span class="em">${t.emoji}</span>
      <div><b>${SS.esc(t.title)}</b><small>${t.sold.toLocaleString('en-IN')} sold • ${SS.inr(t.price)}</small></div>
    </div>`).join('');
}

async function loadProducts() {
  const p = new URLSearchParams({ sort: state.sort, page: state.page, limit: 12 });
  if (state.q) p.set('q', state.q);
  if (state.category !== 'All') p.set('category', state.category);
  if (state.min) p.set('min', state.min);
  if (state.max) p.set('max', state.max);

  SS.$('#grid').setAttribute('aria-busy', 'true');
  SS.$('#grid').innerHTML = '<div class="loading-state" style="grid-column:1/-1">Finding your good finds…</div>';
  const data = await SS.api('/products?' + p.toString());
  SS.$('#grid').setAttribute('aria-busy', 'false');
  SS.$('#resultInfo').textContent = state.q
    ? `${data.total} results for "${state.q}"`
    : `${data.total} product${data.total === 1 ? '' : 's'}${state.category !== 'All' ? ' in ' + state.category : ''}`;

  SS.$('#grid').innerHTML = data.items.length
    ? data.items.map(card).join('')
    : `<div class="empty" style="grid-column:1/-1"><div class="em">🔎</div><h3>No results found</h3><p>Try a different keyword or clear the filters.</p></div>`;

  const pager = SS.$('#pager');
  pager.innerHTML = '';
  if (data.pages > 1) {
    for (let i = 1; i <= data.pages; i++) {
      const b = document.createElement('button');
      b.textContent = i; b.className = i === data.page ? 'on' : '';
      b.onclick = () => { state.page = i; loadProducts(); document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' }); };
      pager.appendChild(b);
    }
  }
}

function card(p) {
  return `<article class="card">
    ${SS.tile(p, `onclick="showProduct('${p.sku}')"`).replace('</div>', `${p.discountPct ? `<span class="off">-${p.discountPct}%</span>` : ''}${topSkus.has(p.sku) ? '<span class="best">#BESTSELLER</span>' : ''}</div>`)}
    <div class="card-body">
      <span class="brand">${SS.esc(p.brand)}</span>
      <div class="title" onclick="showProduct('${p.sku}')">${SS.esc(p.title)}</div>
      <div class="rating">${SS.stars(p.rating)} <span>${p.reviews.toLocaleString('en-IN')}</span></div>
      <div class="price"><sup>₹</sup>${p.price.toLocaleString('en-IN')}</div>
      <div class="mrp">M.R.P: <s>${SS.inr(p.mrp)}</s> (${p.discountPct}% off)</div>
      ${p.stock <= 20 ? `<div class="stock-low">Only ${p.stock} left in stock</div>` : ''}
      <button class="btn" onclick="SS.addToCart('${p.sku}')">Add to Cart</button>
    </div></article>`;
}

async function showProduct(sku) {
  const p = await SS.api('/products/' + sku);
  SS.$('#productInner').innerHTML = `
    <div class="detail">
      ${SS.tile(p)}
      <div>
        <span class="brand">Brand: ${SS.esc(p.brand)} • ${SS.esc(p.category)}</span>
        <h2>${SS.esc(p.title)}</h2>
        <div class="rating">${SS.stars(p.rating)} <span>${p.reviews.toLocaleString('en-IN')} ratings</span></div>
        <div class="price"><sup>₹</sup>${p.price.toLocaleString('en-IN')} <span class="mrp"><s>${SS.inr(p.mrp)}</s> (${p.discountPct}% off)</span></div>
        <p>${SS.esc(p.description)}</p>
        <table class="specs">
          <tr><td>SKU</td><td>${p.sku}</td></tr><tr><td>Category</td><td>${SS.esc(p.category)}</td></tr>
          <tr><td>Units sold</td><td>${(p.sold || 0).toLocaleString('en-IN')}</td></tr>
          <tr><td>Availability</td><td style="color:${p.stock > 20 ? 'var(--green)' : 'var(--red)'};font-weight:700">${p.stock > 0 ? (p.stock > 20 ? 'In stock' : 'Only ' + p.stock + ' left') : 'Out of stock'}</td></tr>
        </table>
        <button class="btn block" ${p.stock ? '' : 'disabled'} onclick="SS.addToCart('${p.sku}');SS.closeAll()">Add to Cart</button>
      </div>
    </div>`;
  SS.openModal('productModal');
}

// controls
SS.$('#sort').onchange = (e) => { state.sort = e.target.value; state.page = 1; loadProducts(); };
SS.$('#applyPrice').onclick = () => {
  const min = SS.$('#minP').value.trim();
  const max = SS.$('#maxP').value.trim();
  if ((min && Number(min) < 0) || (max && Number(max) < 0)) {
    SS.toast('Prices cannot be negative.', true); return;
  }
  if (min && max && Number(min) > Number(max)) {
    SS.toast('Minimum price must be less than or equal to maximum price.', true); return;
  }
  state.min = min; state.max = max; state.page = 1; loadProducts();
};
SS.$('#resetFilters').onclick = () => {
  Object.assign(state, { q: '', category: 'All', min: '', max: '', sort: 'featured', page: 1 });
  SS.$('#minP').value = ''; SS.$('#maxP').value = ''; SS.$('#sort').value = 'featured'; SS.$('#searchInput').value = '';
  history.replaceState(null, '', '/');
  loadCategories(); loadProducts();
};

// refresh leaderboard + stock after an order
window.onOrderPlaced = (silent) => { loadTop(); if (!silent) loadProducts(); else setTimeout(loadProducts, 300); };

(async () => {
  try {
    await loadTop();
    await loadCategories();
    await loadProducts();
  } catch (e) {
    SS.$('#grid').setAttribute('aria-busy', 'false');
    SS.$('#grid').innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="em">⚠️</div><h3>Could not load products</h3><p>${SS.esc(e.message)}. Is the server running and the database seeded (<code>npm run seed</code>)?</p></div>`;
  }
})();

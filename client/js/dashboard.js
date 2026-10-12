SS.mountLayout('dashboard');

const PALETTE = ['#e77b63', '#287d8e', '#6f8f79', '#c9a56a', '#8c6c91', '#496a81', '#d88973', '#9eae83'];
const charts = {};
let refreshing = false;

function chart(id, cfg) {
  if (charts[id]) { charts[id].data = cfg.data; charts[id].update(); return; }
  charts[id] = new Chart(document.getElementById(id), cfg);
}

const compact = (n) => (n >= 1e7 ? (n / 1e7).toFixed(2) + ' Cr' : n >= 1e5 ? (n / 1e5).toFixed(2) + ' L' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : n);

async function load() {
  if (refreshing) return;
  refreshing = true;
  try {
  const [sum, cat, city, trend, lb, matrix] = await Promise.all([
    SS.api('/analytics/summary'), SS.api('/analytics/by-category'), SS.api('/analytics/by-city'),
    SS.api('/analytics/trend'), SS.api('/analytics/leaderboard?limit=10'), SS.api('/analytics/category-city')
  ]);

  SS.$('#kpis').innerHTML = [
    ['Total revenue', '₹' + compact(sum.revenue)], ['Orders', sum.orders.toLocaleString('en-IN')],
    ['Units sold', sum.units.toLocaleString('en-IN')], ['Customers', sum.customers],
    ['Avg order value', SS.inr(sum.avgOrderValue)]
  ].map(([k, v]) => `<div class="kpi"><small>${k}</small><b>${v}</b></div>`).join('');

  chart('catChart', {
    type: 'doughnut',
    data: { labels: cat.map((c) => c.category), datasets: [{ data: cat.map((c) => c.revenue), backgroundColor: PALETTE, borderWidth: 2 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: (c) => ` ${c.label}: ${SS.inr(c.raw)}` } } } }
  });

  chart('cityChart', {
    type: 'bar',
    data: { labels: city.map((c) => c.city), datasets: [{ label: 'Revenue (₹)', data: city.map((c) => c.revenue), backgroundColor: '#e77b63', borderRadius: 6 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: (v) => '₹' + compact(v) } } } }
  });

  chart('trendChart', {
    type: 'line',
    data: { labels: trend.map((t) => t.date.slice(5)), datasets: [{ label: 'Revenue (₹)', data: trend.map((t) => t.revenue), borderColor: '#287d8e', backgroundColor: 'rgba(40,125,142,.14)', fill: true, tension: .35, pointRadius: 3 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: (v) => '₹' + compact(v) } } } }
  });

  const maxSold = Math.max(...lb.map((x) => x.sold), 1);
  SS.$('#lbBody').innerHTML = lb.map((p) => `<tr>
    <td><b>${p.rank}</b></td>
    <td>${p.emoji} ${SS.esc(p.title)}<div class="bar" style="width:${(p.sold / maxSold) * 100}%;margin-top:4px"></div></td>
    <td>${SS.esc(p.category)}</td><td class="num"><b>${p.sold.toLocaleString('en-IN')}</b></td></tr>`).join('');

  // heatmap
  const cats = [...new Set(matrix.map((m) => m.category))];
  const cities = city.map((c) => c.city);
  const map = {}; let max = 1;
  matrix.forEach((m) => { map[m.category + '|' + m.city] = m.revenue; max = Math.max(max, m.revenue); });
  SS.$('#heat').innerHTML = `<thead><tr><th></th>${cities.map((c) => `<th>${SS.esc(c)}</th>`).join('')}</tr></thead><tbody>` +
    cats.map((ct) => `<tr><td>${SS.esc(ct)}</td>${cities.map((c) => {
      const v = map[ct + '|' + c] || 0;
      const a = v / max;
      return `<td style="background:rgba(40,125,142,${(0.08 + a * 0.82).toFixed(2)});color:${a > 0.55 ? '#fff' : '#314650'}">${v ? '₹' + compact(v) : '–'}</td>`;
    }).join('')}</tr>`).join('') + '</tbody>';

  const maxRev = Math.max(...city.map((c) => c.revenue), 1);
  SS.$('#cityBody').innerHTML = city.map((c) => `<tr><td><b>${SS.esc(c.city)}</b></td>
    <td><div class="bar-cell"><div class="bar" style="width:${(c.revenue / maxRev) * 200}px"></div>${SS.inr(c.revenue)}</div></td>
    <td class="num">${c.orders}</td><td class="num">${c.units}</td><td class="num">${SS.inr(c.avgOrderValue)}</td></tr>`).join('');

  SS.$('#updated').textContent = 'Updated ' + new Date().toLocaleTimeString('en-IN') + ' · refreshes every 15 seconds';
  } finally { refreshing = false; }
}

const run = () => load().catch((e) => { SS.$('#updated').textContent = 'Could not refresh analytics: ' + e.message; });
run();
setInterval(run, 15000);

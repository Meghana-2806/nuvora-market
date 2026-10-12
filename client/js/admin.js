(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = (v) => '₹' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const statuses = ['Placed','Processing','Shipped','Delivered','Cancelled'];
  let editingSku = null, productCache = [], orderCache = [], busy = false;
  async function api(path, opts={}) {
    const r = await fetch('/api' + path, { method: opts.method || 'GET', headers: opts.body ? {'Content-Type':'application/json'} : undefined, body: opts.body ? JSON.stringify(opts.body) : undefined, credentials:'same-origin' });
    const data = await r.json().catch(()=>({}));
    if (!r.ok) { if (r.status === 401 || r.status === 403) location.href='/?next=admin'; throw new Error(data.error || 'Request failed'); }
    return data;
  }
  function alertMsg(msg, error=false) { const el=$('#alert'); el.hidden=false; el.className='admin-alert'+(error?' error':''); el.textContent=msg; if (!error) setTimeout(()=>{el.hidden=true},3500); }
  function pill(status) { return `<span class="admin-pill ${String(status).toLowerCase()}">${esc(status)}</span>`; }
  function empty(cols, msg='Nothing to show yet') { return `<tr><td colspan="${cols}"><div class="admin-empty"><b>${esc(msg)}</b>Try refreshing or changing your filters.</div></td></tr>`; }
  function showView(view) { document.querySelectorAll('.admin-view').forEach(el=>el.hidden=el.id!=='view-'+view); document.querySelectorAll('.admin-tabs button').forEach(el=>el.classList.toggle('active',el.dataset.view===view)); if(view==='products') loadProducts(); if(view==='orders') loadOrders(); }
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
  document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.go)));
  $('#storeBtn').onclick=()=>location.href='/shop.html';
  $('#logoutBtn').onclick=async()=>{try{await api('/auth/logout',{method:'POST'});}catch(_){} location.href='/';};
  async function loadOverview() {
    const d=await api('/admin/overview');
    $('#kpis').innerHTML=[['Catalog products',d.products,'Live items available to customers'],['Customer orders',d.orders,'All recorded orders'],['Customers',d.customers,'Registered customer accounts'],['Gross order value',money(d.revenue),'Across all recorded orders']].map(([t,v,n])=>`<div class="admin-card"><small>${t}</small><strong>${v}</strong><div class="kpi-note">${n}</div></div>`).join('');
    $('#orderCountBadge').textContent=d.orders?`· ${d.orders}`:'';
    $('#recentOrders').innerHTML=d.recentOrders.length?d.recentOrders.map(o=>`<tr><td><b>${esc(o.orderNo)}</b><div class="admin-muted">${new Date(o.createdAt).toLocaleDateString('en-IN')}</div></td><td>${esc(o.customerName||'Customer')}</td><td><b>${money(o.total)}</b></td><td>${pill(o.status||'Placed')}</td></tr>`).join(''):empty(4,'No customer orders yet');
    $('#lowStock').innerHTML=d.lowStock.length?d.lowStock.map(p=>`<tr><td><div class="admin-product"><span class="admin-product-icon">${esc(p.emoji||'📦')}</span><div><b>${esc(p.title)}</b><div class="admin-muted">${esc(p.sku)}</div></div></div></td><td class="${p.stock<=2?'stock-low':''}">${p.stock} left</td></tr>`).join(''):empty(2,'All products have healthy stock');
  }
  async function loadProducts() {
    const q=$('#productSearch').value.trim(), c=$('#productCategory').value;
    const p=new URLSearchParams(); if(q)p.set('q',q);if(c!=='All')p.set('category',c);
    $('#productsBody').innerHTML=empty(6,'Loading catalog…');
    try { const d=await api('/admin/products?'+p); productCache=d.items; $('#productsBody').innerHTML=d.items.length?d.items.map(x=>`<tr><td><div class="admin-product"><span class="admin-product-icon">${esc(x.emoji||'📦')}</span><div><b>${esc(x.title)}</b><div class="admin-muted">${esc(x.brand||'')}</div></div></div></td><td>${esc(x.sku)}</td><td><b>${money(x.price)}</b></td><td class="${x.stock<=5?'stock-low':''}">${x.stock}</td><td>${esc(x.category)}</td><td><button class="admin-btn" data-edit="${esc(x.sku)}">Edit</button> <button class="admin-btn danger" data-delete="${esc(x.sku)}">Delete</button></td></tr>`).join(''):empty(6,'No matching products');
      document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editProduct(b.dataset.edit)); document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteProduct(b.dataset.delete));
    } catch(e) { $('#productsBody').innerHTML=empty(6,e.message); }
  }
  function openEditor(product=null) { editingSku=product?.sku||null; $('#productForm').reset(); $('#productEditorTitle').textContent=product?'Edit product':'Add product'; $('#saveProduct').textContent=product?'Save changes':'Save product'; const form=$('#productForm'); ['sku','title','category','brand','price','stock','emoji','description'].forEach(k=>{form.elements[k].value=product?.[k]??'';}); form.elements.sku.disabled=!!product; $('#productEditor').hidden=false; $('#productEditor').scrollIntoView({behavior:'smooth',block:'start'}); }
  function editProduct(sku) { const p=productCache.find(x=>x.sku===sku); if(p)openEditor(p); }
  async function deleteProduct(sku) { const p=productCache.find(x=>x.sku===sku); if(!confirm(`Delete “${p?.title||sku}” from the catalog? This cannot be undone.`))return; try{await api('/admin/products/'+encodeURIComponent(sku),{method:'DELETE'});alertMsg('Product removed from the catalog.');await loadProducts();await loadOverview();}catch(e){alertMsg(e.message,true);} }
  $('#addProductBtn').onclick=()=>openEditor(); $('#cancelProduct').onclick=$('#cancelProduct2').onclick=()=>{$('#productEditor').hidden=true;editingSku=null;};
  $('#productForm').onsubmit=async(e)=>{e.preventDefault();const f=e.currentTarget;const body={};['sku','title','category','brand','price','stock','emoji','description'].forEach(k=>body[k]=f.elements[k].value.trim());body.price=Number(body.price);body.stock=Number(body.stock);$('#saveProduct').disabled=true;try{if(editingSku)await api('/admin/products/'+encodeURIComponent(editingSku),{method:'PATCH',body});else await api('/admin/products',{method:'POST',body});$('#productEditor').hidden=true;alertMsg(editingSku?'Product updated successfully.':'Product added to the live catalog.');editingSku=null;await loadProducts();await loadOverview();}catch(err){alertMsg(err.message,true);}finally{$('#saveProduct').disabled=false;}};
  async function loadOrders() { const q=$('#orderSearch').value.trim(),s=$('#orderStatus').value,p=new URLSearchParams();if(q)p.set('q',q);if(s!=='All')p.set('status',s);$('#ordersBody').innerHTML=empty(6,'Loading orders…');try{const d=await api('/admin/orders?'+p);orderCache=d.items;$('#ordersBody').innerHTML=d.items.length?d.items.map(o=>{const address=o.shippingAddress||{};const items=(o.items||[]).map(i=>`${esc(i.title)} × ${i.qty}`).join('<br>');return `<tr><td><b>${esc(o.orderNo)}</b><div class="admin-muted">${o.createdAt?new Date(o.createdAt).toLocaleString('en-IN'):'—'}</div></td><td><b>${esc(o.customerName||'Customer')}</b><div class="admin-muted">${esc(address.line||'')}<br>${esc(address.city||'')}${address.pincode?' · '+esc(address.pincode):''}</div></td><td><div class="admin-order-items">${items||'—'}</div></td><td><b>${money(o.total)}</b><div class="admin-muted">${esc(o.paymentMethod||'')}</div></td><td>${pill(o.status||'Placed')}</td><td><select aria-label="Update status for ${esc(o.orderNo)}" data-status="${o._id}" class="admin-search-select" style="padding:8px;border:1px solid #dce3de;border-radius:8px;max-width:145px">${statuses.map(st=>`<option ${st===(o.status||'Placed')?'selected':''}>${st}</option>`).join('')}</select><button class="admin-btn" data-save-status="${o._id}" style="margin-top:6px;padding:7px 10px">Save</button></td></tr>`}).join(''):empty(6,'No orders match these filters');document.querySelectorAll('[data-save-status]').forEach(b=>b.onclick=()=>updateStatus(b.dataset.saveStatus));}catch(e){$('#ordersBody').innerHTML=empty(6,e.message);} }
  async function updateStatus(id) { const select=document.querySelector(`[data-status="${CSS.escape(id)}"]`);if(!select)return;try{await api('/admin/orders/'+id+'/status',{method:'PATCH',body:{status:select.value}});alertMsg('Order status updated.');await loadOrders();await loadOverview();}catch(e){alertMsg(e.message,true);} }
  $('#productSearch').addEventListener('input',debounce(loadProducts,250));$('#productCategory').onchange=loadProducts;$('#productRefresh').onclick=loadProducts;$('#ordersRefresh').onclick=loadOrders;$('#orderSearch').addEventListener('input',debounce(loadOrders,250));$('#orderStatus').onchange=loadOrders;
  function debounce(fn,ms){let timer;return()=>{clearTimeout(timer);timer=setTimeout(fn,ms);};}
  async function boot(){try{const {user}=await api('/auth/me');if(!user||user.role!=='admin'){location.href='/?next=admin';return;}$('#adminName').textContent=user.name+' · Admin';await Promise.all([loadOverview(),loadProducts(),loadOrders()]);setInterval(()=>{if(!document.hidden){loadOverview().catch(()=>{});if(!$('#view-orders').hidden)loadOrders().catch(()=>{});}},20000);}catch(e){alertMsg(e.message,true);}}
  boot();
})();

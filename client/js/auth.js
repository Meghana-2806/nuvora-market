(() => {
  const $ = (s) => document.querySelector(s);
  const state = { role: new URLSearchParams(location.search).get('next') === 'admin' ? 'admin' : 'customer', mode: 'login' };
  const form = $('#authForm');
  const message = $('#message');
  const toggleHidden = (selector, hidden) => { $(selector).hidden = hidden; };
  function render() {
    const admin = state.role === 'admin', register = state.mode === 'register';
    document.querySelectorAll('[data-role]').forEach(b => b.classList.toggle('active', b.dataset.role === state.role));
    document.querySelectorAll('[data-mode]').forEach(b => { if (b.classList.contains('mode-btn')) b.classList.toggle('active', b.dataset.mode === state.mode); });
    $('#heading').textContent = register ? (admin ? 'Create admin account' : 'Join Nuvora') : (admin ? 'Administrator sign in' : 'Welcome back');
    $('#subheading').textContent = register ? (admin ? 'Set up a protected administrator account.' : 'Create an account for a more personal shopping experience.') : (admin ? 'Sign in to access Nuvora management analytics.' : 'Sign in to pick up where you left off.');
    toggleHidden('#nameField', !register); toggleHidden('#cityField', !register || admin); toggleHidden('#setupKeyField', !register || !admin);
    $('#password').autocomplete = register ? 'new-password' : 'current-password';
    $('#password').minLength = register ? 8 : 1;
    $('#passwordHint').textContent = register ? 'At least 8 characters' : 'Keep your account secure';
    $('#submitBtn').innerHTML = `${register ? 'Create account' : 'Sign in'} <span>→</span>`;
    $('#bottomLink').innerHTML = register ? 'Already have an account? <button type="button" data-mode="login">Sign in</button>' : 'New to Nuvora? <button type="button" data-mode="register">Create an account</button>';
    message.className = 'message'; message.textContent = '';
  }
  document.querySelectorAll('[data-role]').forEach(b => b.addEventListener('click', () => { state.role = b.dataset.role; render(); }));
  document.addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b) { state.mode = b.dataset.mode; render(); } });
  form.addEventListener('submit', async e => {
    e.preventDefault(); message.className = 'message'; message.textContent = '';
    const submit = $('#submitBtn'); submit.disabled = true;
    const fd = new FormData(form); const body = Object.fromEntries(fd.entries());
    body.accountType = state.role;
    const endpoint = state.mode === 'register' ? '/api/auth/register' : '/api/auth/login';
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to authenticate. Please try again.');
      message.className = 'message success'; message.textContent = 'Signed in successfully. Taking you to your workspace…';
      const user = data.user;
      window.location.href = user.role === 'admin' ? '/dashboard.html' : '/shop.html';
    } catch (err) { message.className = 'message error'; message.textContent = err.message; }
    finally { submit.disabled = false; }
  });
  render();
  // Existing sessions can continue directly; the sign-in page remains the public entry point.
  fetch('/api/auth/me', { credentials: 'same-origin' }).then(r => r.json()).then(({user}) => {
    if (!user) return;
    const link = document.createElement('div'); link.className = 'message success'; link.style.display = 'block';
    link.innerHTML = `You're signed in as <b>${String(user.name).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</b>. <a style="color:inherit;font-weight:700" href="${user.role === 'admin' ? '/dashboard.html' : '/customer-dashboard.html'}">Continue →</a>`;
    form.parentNode.insertBefore(link, form);
  }).catch(() => {});
})();
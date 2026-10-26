/* StoreX — static demo layer. Replaces the Laravel backend (auth, cart, wishlist, checkout, admin actions).
   Everything lives in the browser (localStorage). Nothing is sent to a server. */
(function () {
  'use strict';
  var D = window.SX_DATA || { products: [], users: [] };
  var script = document.currentScript || document.querySelector('script[src$="js/storex-static.js"]');
  var ROOT = (script && script.getAttribute('src') || 'js/storex-static.js').replace(/js\/storex-static\.js$/, '');
  var path = location.pathname.replace(/\/+$/, '');
  var rel = path.substring(path.indexOf(ROOT ? '' : '') ); // not used for logic
  var PAGE = decodeURIComponent((location.pathname.split('/').pop() || 'index.html'));
  var DIR = (function () { var p = location.pathname.split('/'); return p.length > 1 ? p[p.length - 2] : ''; })();
  var AREA = ROOT ? DIR : '';   // 'account' | 'vendor' | 'admin' | ''

  /* ---------------- state ---------------- */
  var KEY = 'sx-static-state-v1';
  function seed() {
    var s = { session: null, nextId: 100, extraUsers: [], data: {} };
    s.data['john@example.com'] = { cart: [{ id: 1, product_id: 3, quantity: 1 }, { id: 2, product_id: 6, quantity: 2 }], wishlist: [2, 5, 8], orders: [] };
    return s;
  }
  function load() { try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.data) return s; } catch (e) {} var n = seed(); save(n); return n; }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s || S)); } catch (e) {} }
  var S = load();
  function users() { return D.users.concat(S.extraUsers); }
  function me() { return S.session ? users().filter(function (u) { return u.email === S.session; })[0] || null : null; }
  function mine() { var u = me(); if (!u) return null; return S.data[u.email] || (S.data[u.email] = { cart: [], wishlist: [], orders: [] }); }
  function prod(id) { return D.products.filter(function (p) { return p.id === +id; })[0]; }
  function money(n) { return Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function totals() {
    var m = mine(), sub = 0, count = 0;
    (m ? m.cart : []).forEach(function (c) { var p = prod(c.product_id); if (p) { sub += p.price * c.quantity; count += c.quantity; } });
    var tax = Math.round(sub * 0.08 * 100) / 100;
    return { sub: sub, tax: tax, total: sub + tax, count: count };
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function home(role) { return ROOT + (role === 'admin' ? 'admin/index.html' : role === 'vendor' ? 'vendor/index.html' : 'account/index.html'); }

  /* ---------------- toast ---------------- */
  function toast(msg, type) {
    var el = document.createElement('div');
    el.textContent = msg;
    var bg = type === 'error' ? '#ef4444' : type === 'info' ? '#3b82f6' : '#0d9488';
    el.style.cssText = 'position:fixed;top:90px;right:20px;z-index:99999;padding:12px 18px;border-radius:10px;color:#fff;font:600 14px system-ui,sans-serif;background:' + bg + ';box-shadow:0 10px 30px rgba(0,0,0,.35);transition:all .3s';
    document.body.appendChild(el);
    setTimeout(function () { el.style.opacity = 0; el.style.transform = 'translateX(30px)'; setTimeout(function () { el.remove(); }, 300); }, 2600);
  }
  window.sxToast = toast;

  /* ---------------- $.ajax shim (jQuery is loaded before this file) ---------------- */
  function api(url, data) {
    var u = me(), m = mine(), path = String(url);
    var json = function (o) { return o; };
    if (/\/cart\/(add|update|remove)$/.test(path) || /\/wishlist\/(add|remove)$/.test(path)) {
      if (!u) return { status: 401, body: { success: false, message: 'Unauthenticated.' } };
    }
    if (/\/cart\/add$/.test(path)) {
      var pid = +data.product_id, q = +data.quantity || 1;
      var ex = m.cart.filter(function (c) { return c.product_id === pid; })[0];
      if (ex) ex.quantity += q; else m.cart.push({ id: S.nextId++, product_id: pid, quantity: q });
      save(); return { status: 200, body: { success: true, message: 'Added to cart!', cart_count: totals().count } };
    }
    if (/\/cart\/update$/.test(path)) {
      m.cart.forEach(function (c) { if (c.id === +data.cart_id) c.quantity = Math.max(1, +data.quantity); });
      save(); var t = totals();
      return { status: 200, body: { success: true, subtotal: money(t.sub), tax: money(t.tax), total: money(t.total), cart_count: t.count } };
    }
    if (/\/cart\/remove$/.test(path)) {
      m.cart = m.cart.filter(function (c) { return c.id !== +data.cart_id; }); save();
      return { status: 200, body: { success: true, message: 'Item removed', cart_count: totals().count } };
    }
    if (/\/wishlist\/add$/.test(path)) { var a = +data.product_id; if (m.wishlist.indexOf(a) < 0) m.wishlist.push(a); save(); return { status: 200, body: { success: true } }; }
    if (/\/wishlist\/remove$/.test(path)) { var r = +data.product_id; m.wishlist = m.wishlist.filter(function (x) { return x !== r; }); save(); return { status: 200, body: { success: true } }; }
    if (/vendors\/\d+\/approve/.test(path)) return { status: 200, body: { success: true, message: 'Vendor approved! (demo)' } };
    if (/vendors\/\d+\/reject/.test(path)) return { status: 200, body: { success: true, message: 'Vendor rejected (demo)' } };
    if (/orders\.status|orders\/\d+\/status/.test(path)) return { status: 200, body: { success: true, message: 'Order status updated (demo)' } };
    return { status: 200, body: { success: true } };
  }
  if (window.jQuery) {
    window.jQuery.ajax = function (opts) {
      opts = opts || {};
      var res = api(opts.url, opts.data || {});
      var d = window.jQuery.Deferred();
      setTimeout(function () {
        if (res.status >= 200 && res.status < 300) { if (opts.success) opts.success(res.body, 'success', {}); d.resolve(res.body); }
        else { var xhr = { status: res.status, responseJSON: res.body }; if (opts.error) opts.error(xhr, 'error', ''); d.reject(xhr); }
        if (opts.complete) opts.complete({}, 'done');
      }, 120);
      return d.promise();
    };
  }

  /* ---------------- text replacement for the logged-in person (templates were rendered for the demo users) ---------------- */
  var DEMO = { customer: { name: 'John Doe', email: 'john@example.com', first: 'John' }, vendor: { name: 'Nova Labs', email: 'nova@storex.com' }, admin: { name: 'Inshal Zahid', email: 'admin@storex.com' } };
  function retext(u) {
    var d = DEMO[u.role === 'admin' ? 'admin' : u.role === 'vendor' ? 'vendor' : 'customer'];
    if (u.email === d.email) return;
    var first = (u.name || '').split(' ')[0];
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n, list = [];
    while ((n = walker.nextNode())) { if (n.parentNode && !/^(SCRIPT|STYLE)$/.test(n.parentNode.nodeName)) list.push(n); }
    list.forEach(function (t) {
      var v = t.nodeValue, o = v;
      v = v.split(d.name).join(u.name).split(d.email).join(u.email);
      if (d.first) v = v.replace(new RegExp('\\b' + d.first + '\\b', 'g'), first);
      if (v !== o) t.nodeValue = v;
    });
    document.querySelectorAll('input').forEach(function (i) {
      if (i.value === d.name) i.value = u.name; else if (i.value === d.email) i.value = u.email;
      else if (d.first && i.value === d.first) i.value = first;
    });
    document.querySelectorAll('.storex-user-avatar, .dashboard-user-avatar, .dashboard-avatar, .dashboard-profile-avatar').forEach(function (a) {
      if (!a.querySelector('img') && a.textContent.trim().length <= 2) a.textContent = (u.name || 'U').charAt(0).toUpperCase();
    });
  }

  /* ---------------- navbar / badges ---------------- */
  function syncNav() {
    var u = me(), role = u ? (u.role === 'admin' ? 'admin' : u.role === 'vendor' ? 'vendor' : 'customer') : 'customer';
    document.querySelectorAll('[data-nav-role]').forEach(function (n) { if (n.getAttribute('data-nav-role') !== role) n.remove(); else n.hidden = false; });
    document.querySelectorAll('[data-auth="user"]').forEach(function (el) { el.hidden = !u; });
    document.querySelectorAll('[data-auth="guest"]').forEach(function (el) { el.hidden = !!u; });
    var t = totals(), m = mine();
    document.querySelectorAll('.storex-cart-count').forEach(function (el) { el.textContent = t.count; el.style.display = t.count > 0 ? '' : 'none'; });
    document.querySelectorAll('a.storex-icon[title="Wishlist"] .storex-icon-badge').forEach(function (el) { var c = m ? m.wishlist.length : 0; el.textContent = c; el.style.display = c > 0 ? '' : 'none'; });
    if (u) retext(u);
    // heart state on product cards
    if (m) document.querySelectorAll('.product-wishlist[data-product-id], .wishlist-toggle-btn[data-product-id]').forEach(function (b) {
      var on = m.wishlist.indexOf(+b.getAttribute('data-product-id')) > -1;
      b.classList.toggle('product-wishlist-active', on); b.classList.toggle('wishlist-active', on); b.textContent = on ? '♥' : '♡';
    });
  }

  /* ---------------- access rules ---------------- */
  function guard() {
    var u = me();
    var needs = /^(cart|checkout|order-success)\.html$/.test(PAGE) && !AREA;
    if (AREA === 'account' && !u) return redirect(ROOT + 'login.html');
    if (AREA === 'vendor' && (!u || u.role !== 'vendor')) return redirect(ROOT + (u ? home(u.role).replace(ROOT, '') : 'login.html'));
    if (AREA === 'admin' && PAGE !== 'login.html' && (!u || u.role !== 'admin')) return redirect(ROOT + (u ? home(u.role).replace(ROOT, '') : 'admin/login.html'));
    if (needs && !u) return redirect(ROOT + 'login.html');
    if (/^(login|register|forgot-password|reset-password)\.html$/.test(PAGE) && !AREA && u) return redirect(home(u.role));
    return false;
  }
  function redirect(url) { location.replace(url); return true; }
  if (guard()) return;

  /* ---------------- cart / checkout / wishlist / orders rendering ---------------- */
  function renderCart() {
    var wrap = document.querySelector('.cart-items'); var m = mine();
    if (!wrap || !m) return;
    if (!m.cart.length) {
      var sec = document.querySelector('.storex-cart .container .row');
      if (sec) sec.outerHTML = '<div class="cart-empty"><div class="cart-empty-icon">🛒</div><h2>Your cart is empty</h2><p>Looks like you haven\'t added anything yet.</p><a href="shop.html" class="btn-storex">Start Shopping <span>→</span></a></div>';
      return;
    }
    wrap.innerHTML = m.cart.map(function (c) {
      var p = prod(c.product_id); if (!p) return '';
      return '<div class="cart-item" data-cart-id="' + c.id + '"><div class="cart-item-image"><img src="' + esc(ROOT + p.image) + '" alt="' + esc(p.name) + '"></div>' +
        '<div class="cart-item-info"><span class="cart-item-category">' + esc(p.category) + '</span><h3>' + esc(p.name) + '</h3><p class="cart-item-vendor">Sold by ' + esc(p.vendor) + '</p>' +
        '<div class="cart-item-controls"><div class="cart-quantity"><button type="button" class="cart-qty-minus" data-cart-id="' + c.id + '">−</button><span class="cart-qty-value" data-cart-id="' + c.id + '">' + c.quantity + '</span><button type="button" class="cart-qty-plus" data-cart-id="' + c.id + '">+</button></div>' +
        '<button type="button" class="cart-item-remove" data-cart-id="' + c.id + '">Remove</button></div></div><div class="cart-item-price"><strong>$' + money(p.price * c.quantity) + '</strong></div></div>';
    }).join('');
    var t = totals();
    var rows = document.querySelectorAll('.cart-summary-row span'); if (rows[0]) rows[0].textContent = 'Subtotal (' + t.count + ' items)';
    setText('#cart-subtotal', '$' + money(t.sub)); setText('#cart-tax', '$' + money(t.tax)); setText('#cart-total', '$' + money(t.total));
  }
  function setText(sel, v) { var e = document.querySelector(sel); if (e) e.textContent = v; }
  function renderCheckout() {
    var box = document.querySelector('.checkout-summary-items'); var m = mine(); if (!box || !m) return;
    if (!m.cart.length) { toast('Your cart is empty', 'info'); setTimeout(function () { location.href = ROOT + 'cart.html'; }, 900); return; }
    box.innerHTML = m.cart.map(function (c) {
      var p = prod(c.product_id); if (!p) return '';
      return '<div class="checkout-summary-item"><div class="checkout-summary-image"><img src="' + esc(ROOT + p.image) + '" alt="' + esc(p.name) + '"><span class="checkout-summary-qty">' + c.quantity + '</span></div>' +
        '<div class="checkout-summary-info"><strong>' + esc(p.name) + '</strong><small>' + esc(p.category) + '</small></div><span class="checkout-summary-price">$' + money(p.price * c.quantity) + '</span></div>';
    }).join('');
    var t = totals(), vals = document.querySelectorAll('.checkout-summary-rows .checkout-summary-row strong');
    if (vals[0]) vals[0].textContent = '$' + money(t.sub); if (vals[2]) vals[2].textContent = '$' + money(t.tax);
    var tot = document.querySelector('.checkout-summary-total strong'); if (tot) tot.textContent = '$' + money(t.total);
  }
  function renderWishlist() {
    var m = mine(); var host = document.querySelector('main .row.g-4'); if (!host || !m || PAGE !== 'wishlist.html') return;
    if (!m.wishlist.length) { host.innerHTML = '<div class="col-12"><div style="text-align:center;padding:80px 20px;"><div style="font-size:4rem;margin-bottom:20px;opacity:.5;">♡</div><h3 style="color:#fff;margin-bottom:12px;">Your wishlist is empty</h3><p style="color:#94a3b8;margin-bottom:25px;">Save products you love for later.</p><a href="' + ROOT + 'shop.html" class="btn-storex">Browse Products <span>→</span></a></div></div>'; return; }
    host.innerHTML = m.wishlist.map(function (id) {
      var p = prod(id); if (!p) return '';
      return '<div class="col-md-6 col-lg-4" id="wishlist-item-' + p.id + '"><div class="product-card" data-product-url="' + ROOT + 'product-' + p.slug + '.html"><div class="product-image">' + (p.badge ? '<span class="product-badge">' + esc(p.badge) + '</span>' : '') +
        '<button class="product-wishlist product-wishlist-active" type="button" data-product-id="' + p.id + '" title="Remove from wishlist">♥</button><img src="' + esc(ROOT + p.image) + '" alt="' + esc(p.name) + '" class="product-real-image"></div>' +
        '<div class="product-info"><span class="product-category">' + esc(p.category) + '</span><h3>' + esc(p.name) + '</h3><div class="product-rating"><span>★★★★★</span><small>' + p.rating + '</small></div>' +
        '<div class="product-bottom"><strong>$' + money(p.price) + '</strong><button class="product-cart add-to-cart-btn" type="button" data-product-id="' + p.id + '">+</button></div></div></div></div>';
    }).join('');
  }
  function renderOrders() {
    var m = mine(); var host = document.querySelector('.dashboard-orders'); if (!host || !m || PAGE !== 'orders.html' || !m.orders.length) return;
    host.insertAdjacentHTML('afterbegin', m.orders.map(function (o) {
      return '<div class="dashboard-order-card"><div class="dashboard-order-header"><div><span class="dashboard-order-number">#' + esc(o.number) + '</span><span class="dashboard-order-date">' + esc(o.date) + '</span></div><span class="dashboard-status dashboard-status-pending">Pending</span></div>' +
        '<div class="dashboard-order-items">' + o.items.map(function (i) { return '<div class="dashboard-order-item"><img src="' + esc(ROOT + i.image) + '" alt="' + esc(i.name) + '"><div><strong>' + esc(i.name) + '</strong><small>Qty: ' + i.quantity + '</small></div><span>$' + money(i.price * i.quantity) + '</span></div>'; }).join('') + '</div>' +
        '<div class="dashboard-order-footer"><div><span class="dashboard-order-total-label">Total</span><strong class="dashboard-order-total">$' + money(o.total) + '</strong></div><div class="dashboard-order-actions"><a href="#" class="dashboard-order-btn" data-demo-order>View Details</a></div></div></div>';
    }).join(''));
  }
  function renderSuccess() {
    var m = mine(); if (PAGE !== 'order-success.html' || !m || !m.orders.length) return;
    var o = m.orders[0], strongs = document.querySelectorAll('.success-info-item strong');
    if (strongs[0]) strongs[0].textContent = '#' + o.number; if (strongs[2]) strongs[2].textContent = '$' + money(o.total);
  }
  function placeOrder(form) {
    var m = mine(), t = totals(); if (!m || !m.cart.length) { toast('Your cart is empty', 'error'); return; }
    var items = m.cart.map(function (c) { var p = prod(c.product_id); return { name: p.name, image: p.image, price: p.price, quantity: c.quantity }; });
    var num = 'STX-2026-' + (Math.floor(Math.random() * 9000) + 1000);
    m.orders.unshift({ number: num, date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }), total: t.total, items: items });
    m.cart = []; save();
    toast('Order placed!'); setTimeout(function () { location.href = ROOT + 'order-success.html'; }, 700);
  }

  /* ---------------- forms (no server: every form is a mock handler) ---------------- */
  function logout() { S.session = null; save(); toast('Logged out'); setTimeout(function () { location.href = ROOT + (AREA === 'admin' ? 'admin/login.html' : 'login.html'); }, 500); }
  function login(email, pass, adminOnly) {
    email = String(email || '').trim().toLowerCase();
    var u = users().filter(function (x) { return x.email.toLowerCase() === email; })[0];
    if (adminOnly && (!u || u.role !== 'admin')) { toast('These credentials do not match an admin account.', 'error'); return; }
    if (u && u.password !== pass) { toast('These credentials do not match our records.', 'error'); return; }
    if (!u) { u = { id: S.nextId++, name: email.split('@')[0], email: email, password: pass, role: 'customer' }; S.extraUsers.push(u); }
    S.session = u.email; save();
    var next = new URLSearchParams(location.search).get('next');
    toast('Welcome back, ' + u.name + '!'); setTimeout(function () { location.href = home(u.role); }, 600);
  }
  function handleForm(f, e) {
    var act = (f.getAttribute('data-action') || ''), method = (f.getAttribute('data-method') || 'GET').toUpperCase();
    var v = function (n) { var el = f.elements[n]; return el ? el.value : ''; };
    if (/(^|\/)admin\/login\.html$|admin\.login/.test(act) || (AREA === 'admin' && PAGE === 'login.html')) return login(v('email'), v('password'), true);
    if (/(^|\/)login\.html$/.test(act)) return login(v('email'), v('password'));
    if (/(^|\/)register\.html$/.test(act)) {
      var pw = v('password'); if (pw.length < 8) return toast('The password must be at least 8 characters.', 'error');
      if (pw !== v('password_confirmation')) return toast('The password confirmation does not match.', 'error');
      var mail = v('email').toLowerCase(); if (users().some(function (x) { return x.email.toLowerCase() === mail; })) return toast('The email has already been taken.', 'error');
      var role = v('role') === 'vendor' ? 'vendor' : 'customer';
      var nu = { id: S.nextId++, name: v('name') || mail.split('@')[0], email: mail, password: pw, role: role };
      S.extraUsers.push(nu); S.session = nu.email; save(); toast('Account created!'); return setTimeout(function () { location.href = home(role); }, 700);
    }
    if (/forgot-password|password\.email/.test(act)) return toast('If that email exists, a reset link has been sent (demo).');
    if (/reset-password|password\.(store|update)/.test(act)) { toast('Password updated (demo).'); return setTimeout(function () { location.href = ROOT + 'login.html'; }, 800); }
    if (/logout/.test(act)) return logout();
    if (/(^|\/)checkout\.html$|checkout\.store/.test(act)) return placeOrder(f);
    if (/addresses\.delete/.test(act)) { var card = f.closest('.dashboard-address-card'); if (card) card.remove(); return toast('Address deleted (demo).'); }
    if (/addresses\.store/.test(act)) return toast('Address saved (demo — not stored).');
    if (/profile\.update/.test(act)) {
      var u = me(); if (u && v('name')) { u.name = v('name'); save(); }
      return toast('Profile updated (demo).');
    }
    if (/avatar/.test(act)) return toast('Photo updated (demo — not stored).');
    if (/payouts\.withdraw/.test(act)) return toast('Withdrawal requested (demo).');
    if (/settings/.test(act)) return toast('Settings saved (demo — not stored).');
    if (/orders\.status/.test(act)) return toast('Order status updated (demo).');
    if (method === 'GET') return filterTable(f);
    toast('Saved (demo only — nothing is stored on a server).');
  }
  function filterTable(f) {
    var q = ((f.elements.search || f.elements.q || {}).value || '').toLowerCase();
    var sels = Array.prototype.filter.call(f.elements, function (el) { return el.tagName === 'SELECT' && el.value; });
    document.querySelectorAll('main table tbody tr').forEach(function (tr) {
      var txt = tr.textContent.toLowerCase(), ok = !q || txt.indexOf(q) > -1;
      sels.forEach(function (s) { if (txt.indexOf(s.value.toLowerCase()) < 0) ok = false; });
      tr.style.display = ok ? '' : 'none';
    });
    var c = document.querySelectorAll('main table tbody tr'); 
  }
  document.addEventListener('submit', function (e) {
    var f = e.target; if (!f || !f.matches || !f.matches('form[data-static]')) return;
    if (e.defaultPrevented) return;
    e.preventDefault(); handleForm(f, e);
  });
  var nativeSubmit = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = function () { if (this.hasAttribute('data-static')) { handleForm(this); return; } return nativeSubmit.call(this); };
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-demo-order]'); if (a) { e.preventDefault(); toast('Details are available for the sample orders only.', 'info'); }
  });
  // live search in admin/vendor tables
  document.addEventListener('input', function (e) {
    var el = e.target; if (!el.form || !el.form.matches('form[data-static][data-method="GET"]')) return;
    if (el.name === 'search' || el.name === 'q') filterTable(el.form);
  });

  function init() { syncNav(); renderCart(); renderCheckout(); renderWishlist(); renderOrders(); renderSuccess(); syncNav(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  // after AJAX changes keep badges in sync
  var _ajax = window.jQuery && window.jQuery.ajax;
  window.addEventListener('storage', syncNav);
  setInterval(function () { if (document.hidden) return; var t = totals(); document.querySelectorAll('.storex-cart-count').forEach(function (el) { if (String(el.textContent) !== String(t.count) && me()) { el.textContent = t.count; el.style.display = t.count > 0 ? '' : 'none'; } }); }, 700);
})();

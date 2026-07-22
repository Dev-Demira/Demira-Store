/* =========================================================
   Demira Store — Admin Dashboard (static, Supabase-backed)
   ========================================================= */

const SB = window.supabase.createClient(window.__SB_URL__, window.__SB_KEY__, {
  auth: { persistSession: true, autoRefreshToken: true, storage: window.localStorage }
});

const $ = (s, el = document) => el.querySelector(s);
const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => '₦' + Number(n || 0).toLocaleString('en-NG');
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());

const App = { session: null, isAdmin: false, tab: 'products', categories: [], products: [], settings: null };

const imgUrl = (src) => !src ? '' : (/^https?:\/\//i.test(src) ? src : `assets/images/${src}`);

/* ============ Boot ============ */
(async function boot() {
  SB.auth.onAuthStateChange((_e, s) => {
    App.session = s;
    App.isAdmin = false;
    render();
    if (s) checkAdmin();
  });
  const { data } = await SB.auth.getSession();
  App.session = data.session;
  if (App.session) await checkAdmin();
  render();
})();

async function checkAdmin() {
  if (!App.session) { App.isAdmin = false; return; }
  const { data } = await SB.from('user_roles').select('role')
    .eq('user_id', App.session.user.id).eq('role', 'admin').maybeSingle();
  App.isAdmin = !!data;
  render();
}

/* ============ Router (top level) ============ */
function render() {
  const root = $('#admApp');
  if (!App.session) { root.innerHTML = ''; root.appendChild(renderAuth()); return; }
  if (!App.isAdmin) { root.innerHTML = ''; root.appendChild(renderUnauthorized()); return; }
  root.innerHTML = '';
  root.appendChild(renderDashboard());
}

/* ============ Auth screen ============ */
function renderAuth() {
  const wrap = el(`
    <div class="adm-auth">
      <div class="adm-auth-card">
        <h1>Demira Admin</h1>
        <p class="subtitle">Sign in to manage your store.</p>
        <div id="authMsg"></div>
        <form id="authForm" autocomplete="on">
          <label for="au-email">Email</label>
          <input id="au-email" type="email" required autocomplete="email" />
          <label for="au-pass">Password</label>
          <input id="au-pass" type="password" required minlength="6" autocomplete="current-password" />
          <button type="submit" class="primary" id="authBtn">Sign in</button>
          <button type="button" class="toggle" id="authToggle">First time? Create the owner account →</button>
        </form>
      </div>
    </div>
  `);
  let mode = 'signin';
  const setMsg = (t, ok) => { $('#authMsg', wrap).innerHTML = t ? `<div class="msg ${ok ? 'ok' : 'err'}">${escapeHtml(t)}</div>` : ''; };
  $('#authToggle', wrap).onclick = () => {
    mode = mode === 'signin' ? 'signup' : 'signin';
    $('#authBtn', wrap).textContent = mode === 'signin' ? 'Sign in' : 'Create admin account';
    $('#authToggle', wrap).textContent = mode === 'signin'
      ? 'First time? Create the owner account →'
      : 'Have an account? Sign in →';
    setMsg('');
  };
  $('#authForm', wrap).onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('#authBtn', wrap); btn.disabled = true; const t = btn.textContent; btn.textContent = '…';
    setMsg('');
    const email = $('#au-email', wrap).value.trim();
    const pass = $('#au-pass', wrap).value;
    try {
      if (mode === 'signup') {
        const { error } = await SB.auth.signUp({ email, password: pass, options: { emailRedirectTo: window.location.origin + '/admin.html' } });
        if (error) throw error;
        setMsg('Account created. If email confirmation is on, check your inbox — otherwise you are signed in.', true);
      } else {
        const { error } = await SB.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
      }
    } catch (err) { setMsg(err.message || String(err), false); }
    finally { btn.disabled = false; btn.textContent = t; }
  };
  return wrap;
}

function renderUnauthorized() {
  const wrap = el(`
    <div class="adm-auth">
      <div class="adm-auth-card">
        <h1>Not authorized</h1>
        <p class="subtitle">Signed in as <strong style="color:#fff;">${escapeHtml(App.session.user.email || '')}</strong>, but this account does not have the admin role.</p>
        <p class="subtitle">The very first account created is automatically granted admin. Sign out and log in with the owner account.</p>
        <button class="primary" id="signOutBtn">Sign out</button>
      </div>
    </div>
  `);
  $('#signOutBtn', wrap).onclick = () => SB.auth.signOut();
  return wrap;
}

/* ============ Dashboard shell ============ */
function renderDashboard() {
  const wrap = el(`
    <div>
      <header class="adm-topbar">
        <div class="brand">
          <div class="logo"><span class="logo-word">Demira</span><span class="logo-sub">Admin</span></div>
        </div>
        <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
          <span class="user-email">${escapeHtml(App.session.user.email || '')}</span>
          <div class="actions">
            <a class="adm-btn adm-btn-ghost adm-btn-sm" href="./" target="_blank" rel="noopener">View site</a>
            <button class="adm-btn adm-btn-ghost adm-btn-sm" id="signOut">Sign out</button>
          </div>
        </div>
      </header>
      <nav class="adm-tabs" role="tablist">
        <button class="adm-tab" data-tab="products">Products</button>
        <button class="adm-tab" data-tab="categories">Categories</button>
        <button class="adm-tab" data-tab="settings">Site Settings</button>
      </nav>
      <main class="adm-main" id="admMain"></main>
    </div>
  `);
  $('#signOut', wrap).onclick = () => SB.auth.signOut();
  wrap.querySelectorAll('.adm-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === App.tab);
    btn.onclick = () => { App.tab = btn.dataset.tab; render(); };
  });
  const main = $('#admMain', wrap);
  if (App.tab === 'products') renderProductsPanel(main);
  else if (App.tab === 'categories') renderCategoriesPanel(main);
  else renderSettingsPanel(main);
  return wrap;
}

/* ============ Products panel ============ */
async function renderProductsPanel(host) {
  host.innerHTML = '<p style="color:#666;">Loading products…</p>';
  const [p, c] = await Promise.all([
    SB.from('products').select('*').order('sort_order'),
    SB.from('categories').select('*').order('sort_order')
  ]);
  App.products = p.data || [];
  App.categories = c.data || [];

  host.innerHTML = '';
  const head = el(`
    <div class="adm-heading">
      <div>
        <h2>Products</h2>
        <div class="count">${App.products.length} item${App.products.length !== 1 ? 's' : ''}</div>
      </div>
      <button class="adm-btn adm-btn-primary" id="newProd">+ New product</button>
    </div>
  `);
  $('#newProd', head).onclick = () => openProductForm(null);
  host.appendChild(head);

  const list = el(`<div class="adm-prod-list"></div>`);
  App.products.forEach(prod => {
    const row = el(`
      <div class="adm-prod-row">
        <img class="r-img" src="${escapeHtml(imgUrl(prod.images && prod.images[0]))}" alt="" onerror="this.style.background='#eee'; this.src='';" />
        <div class="r-info">
          <div class="r-title">${escapeHtml(prod.title)}</div>
          <div class="r-meta">
            ${escapeHtml(prod.category_slug)} · ${fmt(prod.price)}
            ${prod.featured ? '<span class="tag tag-feat">★ Featured</span>' : ''}
            ${!prod.in_stock ? '<span class="tag tag-oos">Out of stock</span>' : ''}
          </div>
        </div>
        <div class="r-actions">
          <button class="adm-btn adm-btn-ghost adm-btn-sm" data-act="feature">${prod.featured ? 'Unfeature' : 'Feature'}</button>
          <button class="adm-btn adm-btn-ghost adm-btn-sm" data-act="stock">${prod.in_stock ? 'Mark OOS' : 'In stock'}</button>
          <button class="adm-btn adm-btn-ghost adm-btn-sm" data-act="edit">Edit</button>
          <button class="adm-btn adm-btn-danger adm-btn-sm" data-act="del">Delete</button>
        </div>
      </div>
    `);
    row.querySelector('[data-act="feature"]').onclick = async () => { await SB.from('products').update({ featured: !prod.featured }).eq('id', prod.id); renderProductsPanel(host); };
    row.querySelector('[data-act="stock"]').onclick = async () => { await SB.from('products').update({ in_stock: !prod.in_stock }).eq('id', prod.id); renderProductsPanel(host); };
    row.querySelector('[data-act="edit"]').onclick = () => openProductForm(prod);
    row.querySelector('[data-act="del"]').onclick = async () => {
      if (!confirm(`Delete "${prod.title}"? This cannot be undone.`)) return;
      await SB.from('products').delete().eq('id', prod.id);
      renderProductsPanel(host);
    };
    list.appendChild(row);
  });
  host.appendChild(list);

  function openProductForm(product) {
    host.innerHTML = '';
    host.appendChild(renderProductForm(product, App.categories, () => renderProductsPanel(host)));
  }
}

/* ============ Product form (structured) ============ */
function renderProductForm(product, categories, onDone) {
  const isNew = !product;
  const state = {
    slug: product?.slug ?? '',
    title: product?.title ?? '',
    brand: product?.brand ?? '',
    category_slug: product?.category_slug ?? (categories[0]?.slug ?? ''),
    price: product?.price ?? '',
    compare_price: product?.compare_price ?? '',
    short_desc: product?.short_desc ?? '',
    overview: Array.isArray(product?.overview)
      ? product.overview.join('\n\n')
      : (typeof product?.overview === 'string'
          ? (product.overview.trim().startsWith('[')
              ? (JSON.parse(product.overview || '[]').join('\n\n'))
              : product.overview)
          : ''),
    badge: product?.badge ?? '',
    in_stock: product?.in_stock ?? true,
    featured: product?.featured ?? false,
    sort_order: product?.sort_order ?? 0,
    images: Array.isArray(product?.images) ? [...product.images] : [],
    highlights: product ? normalizeHighlights(product.highlights) : defaultHighlights(),
    specs: product ? normalizeKV(product.specs) : defaultSpecs(),
    display_specs: product ? normalizeKV(product.display_specs) : defaultDisplaySpecs(),
  };

  const form = el(`
    <form class="adm-form" id="prodForm" novalidate>
      <div class="adm-heading">
        <div>
          <h2>${isNew ? 'New product' : 'Edit product'}</h2>
          <div class="count">Fields marked * are required</div>
        </div>
        <button type="button" class="adm-btn adm-btn-ghost" id="pfCancel">Back</button>
      </div>

      <div class="adm-section-label">Basics</div>
      <div class="adm-grid cols-2">
        <div class="adm-field"><label>Title *</label><input class="adm-input" name="title" required /></div>
        <div class="adm-field"><label>Slug (URL id) *</label><input class="adm-input" name="slug" required placeholder="e.g. dell-xps-13" /></div>
        <div class="adm-field"><label>Brand</label><input class="adm-input" name="brand" placeholder="e.g. HP, Dell" /></div>
        <div class="adm-field"><label>Category *</label>
          <select class="adm-select" name="category_slug" required>
            ${categories.map(c => `<option value="${escapeHtml(c.slug)}">${escapeHtml(c.title)}</option>`).join('')}
          </select>
        </div>
        <div class="adm-field"><label>Price (₦) *</label><input class="adm-input" name="price" type="number" step="0.01" required /></div>
        <div class="adm-field"><label>Compare price <span class="hint">optional — shows as strikethrough</span></label><input class="adm-input" name="compare_price" type="number" step="0.01" /></div>
        <div class="adm-field"><label>Badge <span class="hint">e.g. "New", "Best seller"</span></label><input class="adm-input" name="badge" /></div>
        <div class="adm-field"><label>Sort order</label><input class="adm-input" name="sort_order" type="number" /></div>
      </div>

      <div class="adm-field" style="margin-top:14px;"><label>Short description</label>
        <textarea class="adm-textarea" name="short_desc" rows="2" placeholder="One-line summary shown on cards"></textarea>
      </div>
      <div class="adm-field" style="margin-top:14px;"><label>Overview <span class="hint">separate paragraphs with a blank line</span></label>
        <textarea class="adm-textarea" name="overview" rows="6"></textarea>
      </div>

      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:14px;">
        <label class="adm-check"><input type="checkbox" name="in_stock" /> In stock</label>
        <label class="adm-check"><input type="checkbox" name="featured" /> Featured on home page</label>
      </div>

      <div class="adm-section-label">Product images</div>
      <div class="adm-image-grid" id="imgGrid"></div>
      <div class="adm-file-wrap">
        <label class="adm-file-label" for="fileInput">
          <span class="adm-file-icon" aria-hidden="true">📁</span>
          <span class="adm-file-text">
            <strong>Choose image files to upload</strong>
            <span class="adm-file-hint">Click to browse — JPG or PNG, up to ~5&nbsp;MB each. You can pick multiple images.</span>
          </span>
        </label>
        <input id="fileInput" class="adm-file" type="file" accept="image/*" multiple />
      </div>
      <div class="hint" id="uploadHint" style="font-size:12.5px; color:var(--ink-3); margin-top:8px;">Or paste a link instead: <button type="button" id="addUrl" class="adm-btn adm-btn-ghost adm-btn-sm" style="display:inline-block;">+ Add image URL</button></div>

      <div class="adm-section-label">Highlights <span class="hint" style="font-weight:400; text-transform:none; letter-spacing:0; color:var(--muted); font-size:12px;">— shown as feature tiles on the product page</span></div>
      <div class="adm-repeat" id="hlList"></div>
      <button type="button" class="adm-btn adm-btn-ghost adm-btn-sm adm-repeat-add" id="hlAdd">+ Add highlight</button>

      <div class="adm-section-label">Full specifications <span class="hint" style="font-weight:400; text-transform:none; letter-spacing:0; color:var(--muted); font-size:12px;">— full spec table</span></div>
      <div class="adm-repeat" id="spList"></div>
      <button type="button" class="adm-btn adm-btn-ghost adm-btn-sm adm-repeat-add" id="spAdd">+ Add specification</button>

      <div class="adm-section-label">Display & design specs <span class="hint" style="font-weight:400; text-transform:none; letter-spacing:0; color:var(--muted); font-size:12px;">— shown next to the second image</span></div>
      <div class="adm-repeat" id="dsList"></div>
      <button type="button" class="adm-btn adm-btn-ghost adm-btn-sm adm-repeat-add" id="dsAdd">+ Add display spec</button>

      <div id="pfAlert"></div>
      <div class="adm-footer-actions">
        <button type="submit" class="adm-btn adm-btn-primary" id="pfSave">${isNew ? 'Create product' : 'Save changes'}</button>
        <button type="button" class="adm-btn adm-btn-ghost" id="pfCancel2">Cancel</button>
      </div>
    </form>
  `);

  // Hydrate fields
  form.querySelector('[name=title]').value = state.title;
  form.querySelector('[name=slug]').value = state.slug;
  form.querySelector('[name=brand]').value = state.brand;
  form.querySelector('[name=category_slug]').value = state.category_slug;
  form.querySelector('[name=price]').value = state.price;
  form.querySelector('[name=compare_price]').value = state.compare_price ?? '';
  form.querySelector('[name=badge]').value = state.badge;
  form.querySelector('[name=sort_order]').value = state.sort_order;
  form.querySelector('[name=short_desc]').value = state.short_desc;
  form.querySelector('[name=overview]').value = state.overview;
  form.querySelector('[name=in_stock]').checked = state.in_stock;
  form.querySelector('[name=featured]').checked = state.featured;

  form.querySelector('[name=slug]').addEventListener('input', (e) => {
    e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  });

  // Images
  const imgGrid = $('#imgGrid', form);
  const renderImages = () => {
    imgGrid.innerHTML = '';
    state.images.forEach((src, i) => {
      const tile = el(`
        <div class="adm-image-tile">
          <img src="${escapeHtml(imgUrl(src))}" alt="" />
          <button type="button" class="rm" aria-label="Remove">×</button>
        </div>
      `);
      tile.querySelector('.rm').onclick = () => { state.images.splice(i, 1); renderImages(); };
      imgGrid.appendChild(tile);
    });
    if (!state.images.length) {
      imgGrid.appendChild(el(`<div style="font-size:13px; color:#888;">No images yet. Upload or add a URL below.</div>`));
    }
  };
  renderImages();

  $('#fileInput', form).addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const hint = $('#uploadHint', form);
    hint.textContent = 'Uploading…';
    try {
      for (const file of files) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${uid()}.${ext}`;
        const { error } = await SB.storage.from('product-images').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
        if (error) throw error;
        const { data } = SB.storage.from('product-images').getPublicUrl(path);
        state.images.push(data.publicUrl);
        renderImages();
      }
      hint.innerHTML = `Uploaded ${files.length} image(s). You can add more or <button type="button" id="addUrl2" class="adm-btn adm-btn-ghost adm-btn-sm" style="display:inline-block;">+ Add image URL</button>`;
      const btn = $('#addUrl2', form); if (btn) btn.onclick = addUrl;
    } catch (err) {
      hint.innerHTML = `<span style="color:var(--danger);">Upload failed: ${escapeHtml(err.message || String(err))}</span>`;
    }
    e.target.value = '';
  });

  const addUrl = () => {
    const u = prompt('Image URL or local filename (e.g. laptop-01.jpg):');
    if (u && u.trim()) { state.images.push(u.trim()); renderImages(); }
  };
  $('#addUrl', form).onclick = addUrl;

  // Repeatable rows
  buildHighlights(form, state);
  buildKV(form, '#spList', '#spAdd', state, 'specs');
  buildKV(form, '#dsList', '#dsAdd', state, 'display_specs');

  // Cancel
  $('#pfCancel', form).onclick = onDone;
  $('#pfCancel2', form).onclick = onDone;

  // Submit
  form.onsubmit = async (e) => {
    e.preventDefault();
    const alertBox = $('#pfAlert', form);
    alertBox.innerHTML = '';
    const btn = $('#pfSave', form); btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const fd = new FormData(form);
      const overviewText = String(fd.get('overview') || '').trim();
      const overviewArr = overviewText ? overviewText.split(/\n{2,}/).map(s => s.trim()).filter(Boolean) : [];

      const payload = {
        slug: String(fd.get('slug') || '').trim(),
        title: String(fd.get('title') || '').trim(),
        brand: String(fd.get('brand') || '').trim() || null,
        category_slug: String(fd.get('category_slug') || '').trim(),
        price: Number(fd.get('price')) || 0,
        compare_price: fd.get('compare_price') ? Number(fd.get('compare_price')) : null,
        short_desc: String(fd.get('short_desc') || '').trim() || null,
        overview: JSON.stringify(overviewArr),
        badge: String(fd.get('badge') || '').trim() || null,
        in_stock: !!fd.get('in_stock'),
        featured: !!fd.get('featured'),
        sort_order: Number(fd.get('sort_order')) || 0,
        highlights: state.highlights.filter(h => h.value || h.label).map(h => ({ icon: h.icon || '', label: h.label || '', value: h.value || '' })),
        specs: state.specs.filter(kv => kv[0] || kv[1]),
        display_specs: state.display_specs.filter(kv => kv[0] || kv[1]),
        images: state.images,
      };

      if (!payload.slug || !payload.title || !payload.category_slug) throw new Error('Title, slug and category are required.');

      if (product) {
        const { error } = await SB.from('products').update(payload).eq('id', product.id);
        if (error) throw error;
      } else {
        const { error } = await SB.from('products').insert(payload);
        if (error) throw error;
      }
      onDone();
    } catch (err) {
      alertBox.innerHTML = `<div class="adm-alert err">${escapeHtml(err.message || String(err))}</div>`;
      btn.disabled = false; btn.textContent = isNew ? 'Create product' : 'Save changes';
    }
  };

  return form;
}

function buildHighlights(form, state) {
  const list = $('#hlList', form);
  const draw = () => {
    list.innerHTML = '';
    state.highlights.forEach((h, i) => {
      const row = el(`
        <div class="adm-repeat-row hl">
          <div class="adm-field"><label>Icon</label><input class="adm-input" placeholder="🖥" value="${escapeHtml(h.icon || '')}" data-k="icon" /></div>
          <div class="adm-field"><label>Value</label><input class="adm-input" placeholder="12.3-inch" value="${escapeHtml(h.value || '')}" data-k="value" /></div>
          <div class="adm-field"><label>Label</label><input class="adm-input" placeholder="Display" value="${escapeHtml(h.label || '')}" data-k="label" /></div>
          <button type="button" class="adm-btn adm-btn-danger adm-btn-sm" data-rm>Remove</button>
        </div>
      `);
      row.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', () => { state.highlights[i][inp.dataset.k] = inp.value; });
      });
      row.querySelector('[data-rm]').onclick = () => { state.highlights.splice(i, 1); draw(); };
      list.appendChild(row);
    });
    if (!state.highlights.length) list.appendChild(el(`<div style="font-size:13px; color:#888;">No highlights yet — click "+ Add highlight" below.</div>`));
  };
  $('#hlAdd', form).onclick = () => { state.highlights.push({ icon: '', label: '', value: '' }); draw(); };
  draw();
}

function buildKV(form, listSel, addSel, state, key) {
  const list = $(listSel, form);
  const label = key === 'specs' ? 'specification' : 'display spec';
  const draw = () => {
    list.innerHTML = '';
    state[key].forEach((kv, i) => {
      const row = el(`
        <div class="adm-repeat-row kv">
          <div class="adm-field"><label>Label</label><input class="adm-input" placeholder="Processor" value="${escapeHtml(kv[0] || '')}" data-k="0" /></div>
          <div class="adm-field"><label>Value</label><input class="adm-input" placeholder="Intel Core i5-7300U" value="${escapeHtml(kv[1] || '')}" data-k="1" /></div>
          <button type="button" class="adm-btn adm-btn-danger adm-btn-sm" data-rm>Remove</button>
        </div>
      `);
      row.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', () => { state[key][i][Number(inp.dataset.k)] = inp.value; });
      });
      row.querySelector('[data-rm]').onclick = () => { state[key].splice(i, 1); draw(); };
      list.appendChild(row);
    });
    if (!state[key].length) list.appendChild(el(`<div style="font-size:13px; color:#888;">No ${label}s yet — click "+ Add" below.</div>`));
  };
  $(addSel, form).onclick = () => { state[key].push(['', '']); draw(); };
  draw();
}

function normalizeHighlights(v) {
  if (!v) return [];
  const arr = typeof v === 'string' ? safeJson(v, []) : v;
  if (!Array.isArray(arr)) return [];
  return arr.map(h => ({ icon: h?.icon || '', label: h?.label || '', value: h?.value || '' }));
}
function normalizeKV(v) {
  if (!v) return [];
  const arr = typeof v === 'string' ? safeJson(v, []) : v;
  if (!Array.isArray(arr)) return [];
  return arr.map(row => Array.isArray(row) ? [row[0] || '', row[1] || ''] : ['', '']);
}
function safeJson(s, d) { try { return JSON.parse(s); } catch { return d; } }

/* Default preset fields for a NEW product — moderators just fill in values. */
function defaultHighlights() {
  return [
    { icon: '🖥', label: 'Display',    value: '' },
    { icon: '⚙',  label: 'Processor',  value: '' },
    { icon: '💾', label: 'RAM',        value: '' },
    { icon: '💽', label: 'Storage',    value: '' },
    { icon: '🔋', label: 'Battery',    value: '' },
    { icon: '🪟', label: 'OS',         value: '' },
  ];
}
function defaultSpecs() {
  return [
    ['Processor', ''],
    ['RAM', ''],
    ['Storage', ''],
    ['Display', ''],
    ['Graphics', ''],
    ['Operating system', ''],
    ['Battery', ''],
    ['Weight', ''],
    ['Ports', ''],
    ['Warranty', ''],
  ];
}
function defaultDisplaySpecs() {
  return [
    ['Screen size', ''],
    ['Resolution', ''],
    ['Panel type', ''],
    ['Refresh rate', ''],
    ['Touchscreen', ''],
    ['Brightness', ''],
  ];
}

/* ============ Categories panel ============ */
async function renderCategoriesPanel(host) {
  host.innerHTML = '<p style="color:#666;">Loading categories…</p>';
  const { data } = await SB.from('categories').select('*').order('sort_order');
  App.categories = data || [];
  host.innerHTML = '';

  const head = el(`
    <div class="adm-heading">
      <div><h2>Categories</h2><div class="count">${App.categories.length} categories</div></div>
      <button class="adm-btn adm-btn-primary" id="newCat">+ New category</button>
    </div>
  `);
  $('#newCat', head).onclick = () => openForm(null);
  host.appendChild(head);

  const list = el(`<div class="adm-prod-list"></div>`);
  App.categories.forEach(c => {
    const row = el(`
      <div class="adm-prod-row">
        <div class="r-img" style="display:grid;place-items:center; font-size:30px; background:var(--bg-2);">${escapeHtml(c.icon || '·')}</div>
        <div class="r-info">
          <div class="r-title">${escapeHtml(c.title)}</div>
          <div class="r-meta">/${escapeHtml(c.slug)} · ${escapeHtml(c.tagline || '')}</div>
        </div>
        <div class="r-actions">
          <button class="adm-btn adm-btn-ghost adm-btn-sm" data-act="edit">Edit</button>
          <button class="adm-btn adm-btn-danger adm-btn-sm" data-act="del">Delete</button>
        </div>
      </div>
    `);
    row.querySelector('[data-act="edit"]').onclick = () => openForm(c);
    row.querySelector('[data-act="del"]').onclick = async () => {
      if (!confirm(`Delete category "${c.title}"? Products in it will be orphaned.`)) return;
      await SB.from('categories').delete().eq('id', c.id);
      renderCategoriesPanel(host);
    };
    list.appendChild(row);
  });
  host.appendChild(list);

  function openForm(cat) {
    host.innerHTML = '';
    const isNew = !cat;
    const form = el(`
      <form class="adm-form">
        <div class="adm-heading">
          <h2>${isNew ? 'New category' : 'Edit category'}</h2>
          <button type="button" class="adm-btn adm-btn-ghost" id="cfBack">Back</button>
        </div>
        <div class="adm-grid cols-2">
          <div class="adm-field"><label>Title *</label><input class="adm-input" name="title" required /></div>
          <div class="adm-field"><label>Slug (URL id) *</label><input class="adm-input" name="slug" required /></div>
          <div class="adm-field"><label>Icon (emoji)</label><input class="adm-input" name="icon" /></div>
          <div class="adm-field"><label>Sort order</label><input class="adm-input" name="sort_order" type="number" /></div>
        </div>
        <div class="adm-field" style="margin-top:14px;"><label>Tagline</label>
          <input class="adm-input" name="tagline" placeholder="Short one-liner shown on the category page" />
        </div>
        <div id="cfAlert"></div>
        <div class="adm-footer-actions">
          <button type="submit" class="adm-btn adm-btn-primary" id="cfSave">${isNew ? 'Create' : 'Save changes'}</button>
          <button type="button" class="adm-btn adm-btn-ghost" id="cfCancel">Cancel</button>
        </div>
      </form>
    `);
    if (cat) {
      form.querySelector('[name=title]').value = cat.title;
      form.querySelector('[name=slug]').value = cat.slug;
      form.querySelector('[name=icon]').value = cat.icon || '';
      form.querySelector('[name=tagline]').value = cat.tagline || '';
      form.querySelector('[name=sort_order]').value = cat.sort_order || 0;
    }
    $('#cfBack', form).onclick = () => renderCategoriesPanel(host);
    $('#cfCancel', form).onclick = () => renderCategoriesPanel(host);
    form.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const payload = {
        title: String(fd.get('title') || '').trim(),
        slug: String(fd.get('slug') || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        icon: String(fd.get('icon') || '').trim() || null,
        tagline: String(fd.get('tagline') || '').trim() || null,
        sort_order: Number(fd.get('sort_order')) || 0,
      };
      const { error } = cat
        ? await SB.from('categories').update(payload).eq('id', cat.id)
        : await SB.from('categories').insert(payload);
      if (error) $('#cfAlert', form).innerHTML = `<div class="adm-alert err">${escapeHtml(error.message)}</div>`;
      else renderCategoriesPanel(host);
    };
    host.appendChild(form);
  }
}

/* ============ Settings panel ============ */
async function renderSettingsPanel(host) {
  host.innerHTML = '<p style="color:#666;">Loading settings…</p>';
  const { data } = await SB.from('site_settings').select('*').eq('id', 1).maybeSingle();
  const s = data || {};
  const faqs = (s.extra && Array.isArray(s.extra.faqs)) ? s.extra.faqs : [];

  host.innerHTML = '';
  const form = el(`
    <form class="adm-form">
      <div class="adm-heading">
        <h2>Site settings</h2>
        <div class="count">Everything below appears live on your website.</div>
      </div>

      <div class="adm-section-label">Branding & contact</div>
      <div class="adm-grid cols-2">
        <div class="adm-field"><label>Store name</label><input class="adm-input" name="name" /></div>
        <div class="adm-field"><label>Tagline</label><input class="adm-input" name="tagline" /></div>
        <div class="adm-field"><label>Contact email</label><input class="adm-input" name="email" type="email" /></div>
        <div class="adm-field"><label>WhatsApp phone <span class="hint">digits only, e.g. 2349059639220</span></label><input class="adm-input" name="wa_phone" /></div>
      </div>

      <div class="adm-section-label">Integrations</div>
      <div class="adm-grid cols-2">
        <div class="adm-field"><label>Paystack public key</label><input class="adm-input" name="paystack_key" placeholder="pk_live_..." /></div>
        <div class="adm-field"><label>Web3Forms access key <span class="hint">used only for the contact form</span></label><input class="adm-input" name="web3forms_key" /></div>
      </div>

      <div class="adm-section-label">Home page copy</div>
      <div class="adm-field"><label>Announcement bar</label><input class="adm-input" name="announcement" /></div>
      <div class="adm-grid cols-2" style="margin-top:14px;">
        <div class="adm-field"><label>Hero title</label><input class="adm-input" name="hero_title" /></div>
        <div class="adm-field"><label>Hero subtitle</label><textarea class="adm-textarea" name="hero_subtitle" rows="2"></textarea></div>
      </div>
      <div class="adm-field" style="margin-top:14px;"><label>About (home page)</label>
        <textarea class="adm-textarea" name="about" rows="4"></textarea>
      </div>

      <div class="adm-section-label">Pages</div>
      <div class="adm-field"><label>Services intro</label><textarea class="adm-textarea" name="services_intro" rows="3"></textarea></div>
      <div class="adm-field" style="margin-top:14px;"><label>Contact intro</label><textarea class="adm-textarea" name="contact_intro" rows="3"></textarea></div>

      <div class="adm-section-label">FAQs <span class="hint" style="font-weight:400; text-transform:none; letter-spacing:0; color:var(--muted); font-size:12px;">— shown on home & contact pages</span></div>
      <div class="adm-repeat" id="faqList"></div>
      <button type="button" class="adm-btn adm-btn-ghost adm-btn-sm adm-repeat-add" id="faqAdd">+ Add FAQ</button>

      <div id="sAlert"></div>
      <div class="adm-footer-actions">
        <button type="submit" class="adm-btn adm-btn-primary" id="sSave">Save settings</button>
      </div>
    </form>
  `);

  ['name','tagline','email','wa_phone','paystack_key','web3forms_key','announcement','hero_title','hero_subtitle','about','services_intro','contact_intro'].forEach(k => {
    const inp = form.querySelector(`[name=${k}]`); if (inp) inp.value = s[k] ?? '';
  });

  // FAQs repeatable
  const faqState = faqs.map(f => ({ q: f.q || '', a: f.a || '' }));
  const faqList = $('#faqList', form);
  const drawFaqs = () => {
    faqList.innerHTML = '';
    faqState.forEach((f, i) => {
      const row = el(`
        <div class="adm-repeat-row" style="grid-template-columns:1fr auto; align-items:start;">
          <div style="display:grid; gap:8px;">
            <div class="adm-field"><label>Question</label><input class="adm-input" value="${escapeHtml(f.q)}" data-k="q" /></div>
            <div class="adm-field"><label>Answer</label><textarea class="adm-textarea" rows="2" data-k="a">${escapeHtml(f.a)}</textarea></div>
          </div>
          <button type="button" class="adm-btn adm-btn-danger adm-btn-sm" data-rm>Remove</button>
        </div>
      `);
      row.querySelectorAll('[data-k]').forEach(inp => inp.addEventListener('input', () => { faqState[i][inp.dataset.k] = inp.value; }));
      row.querySelector('[data-rm]').onclick = () => { faqState.splice(i, 1); drawFaqs(); };
      faqList.appendChild(row);
    });
    if (!faqState.length) faqList.appendChild(el(`<div style="font-size:13px; color:#888;">No FAQs yet — click "+ Add FAQ" below.</div>`));
  };
  $('#faqAdd', form).onclick = () => { faqState.push({ q: '', a: '' }); drawFaqs(); };
  drawFaqs();

  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('#sSave', form); btn.disabled = true; btn.textContent = 'Saving…';
    const alertBox = $('#sAlert', form); alertBox.innerHTML = '';
    const fd = new FormData(form);
    const extra = { ...(s.extra || {}), faqs: faqState.filter(f => f.q || f.a) };
    const payload = {
      name: fd.get('name') || 'Demira Store',
      tagline: fd.get('tagline') || '',
      email: fd.get('email') || null,
      wa_phone: fd.get('wa_phone') || null,
      paystack_key: fd.get('paystack_key') || null,
      web3forms_key: fd.get('web3forms_key') || null,
      announcement: fd.get('announcement') || null,
      hero_title: fd.get('hero_title') || null,
      hero_subtitle: fd.get('hero_subtitle') || null,
      about: fd.get('about') || null,
      services_intro: fd.get('services_intro') || null,
      contact_intro: fd.get('contact_intro') || null,
      extra,
    };
    const { error } = await SB.from('site_settings').update(payload).eq('id', 1);
    if (error) alertBox.innerHTML = `<div class="adm-alert err">${escapeHtml(error.message)}</div>`;
    else alertBox.innerHTML = `<div class="adm-alert ok">✓ Saved — changes are live on the site.</div>`;
    btn.disabled = false; btn.textContent = 'Save settings';
  };

  host.appendChild(form);
}

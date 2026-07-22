/* =========================================================
   Demira Store — SPA storefront (Supabase-backed)
   ========================================================= */

const SB = window.supabase.createClient(window.__SB_URL__, window.__SB_KEY__, {
  auth: { persistSession: false }
});

const CFG = { products: [], categories: [], site: {}, faqs: [], currentProduct: null };

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
const fmt = n => '₦' + Number(n).toLocaleString('en-NG');
const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+()\-\s\d]{7,20}$/;

// Images can be either a local filename (laptop-01.jpg) or a full https URL
function img(src) {
  if (!src) return '';
  if (/^https?:\/\//i.test(src)) return src;
  return `assets/images/${src}`;
}

// ============ Boot ============
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const [settingsRes, catsRes, prodsRes] = await Promise.all([
      SB.from('site_settings').select('*').eq('id', 1).maybeSingle(),
      SB.from('categories').select('*').order('sort_order'),
      SB.from('products').select('*').order('sort_order')
    ]);
    if (settingsRes.error) throw settingsRes.error;
    if (catsRes.error) throw catsRes.error;
    if (prodsRes.error) throw prodsRes.error;

    CFG.site = settingsRes.data || {};
    CFG.categories = catsRes.data || [];
    CFG.products = prodsRes.data || [];
    CFG.faqs = (CFG.site.extra && CFG.site.extra.faqs) || [];

    buildShell();
    route();
    window.addEventListener('hashchange', route);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  } catch (err) {
    console.error(err);
    document.getElementById('app').innerHTML = `<div class="container section"><h1>Couldn't load store.</h1><p>${escapeHtml(err.message || String(err))}</p></div>`;
  }
});

// ============ Shell ============
function buildShell() {
  const site = CFG.site;
  const waUrl = waLink('Hi, I saw your store online. Can you help me place an order?');
  const brand = `<span class="logo-word">Demira</span><span class="logo-dot" aria-hidden="true"></span><span class="logo-sub">Store</span>`;

  $('#announcement').innerHTML = `
    <div class="marquee"><div class="marquee-track">
      <span>${escapeHtml(site.announcement || 'Free delivery across Nigeria · Ships within 24 hours · 30-day warranty · Secure Paystack checkout')}</span>
      <span>${escapeHtml(site.announcement || 'Free delivery across Nigeria · Ships within 24 hours · 30-day warranty · Secure Paystack checkout')}</span>
    </div></div>`;

  $('#site-header').innerHTML = `
    <div class="container header-inner">
      <div class="header-left">
        <a href="#/contact" class="icon-btn" aria-label="Contact us" title="Contact us">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v12H5.17L4 17.17V4z"/></svg>
        </a>
      </div>
      <a href="#/" class="logo" aria-label="Demira Store home">${brand}</a>
      <div class="header-actions">
        <button class="menu-btn" aria-label="Open menu" id="btnMenu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
      </div>
    </div>`;

  $('#sidenav').innerHTML = `
    <div class="sidenav-header">
      <div class="logo">${brand}</div>
      <button class="sidenav-close" id="btnClose" aria-label="Close menu">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <nav class="sidenav-body" aria-label="Primary">
      <div class="sidenav-section-label">Browse</div>
      <a href="#/" class="sidenav-link" data-nav><span class="ico">✦</span><span>Home</span><span class="arrow">›</span></a>
      ${CFG.categories.map(c => `
        <a href="#/category/${c.slug}" class="sidenav-link" data-nav>
          <span class="ico">${c.icon || '·'}</span><span>${escapeHtml(c.title)}</span><span class="arrow">›</span>
        </a>`).join('')}
      <div class="sidenav-section-label">Company</div>
      <a href="#/services" class="sidenav-link" data-nav><span class="ico">◆</span><span>Services</span><span class="arrow">›</span></a>
      <a href="#/contact" class="sidenav-link" data-nav><span class="ico">✉</span><span>Contact</span><span class="arrow">›</span></a>
    </nav>
    <div class="sidenav-footer">
      <a href="#/category/laptops" class="btn btn-gold btn-block btn-lg" id="navShopBtn">Shop Now</a>
      <p class="sidenav-tag">Free delivery · 30-day warranty · Secure Paystack</p>
    </div>`;

  $('#footer').innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <div class="logo">${brand}</div>
          <p>${escapeHtml(site.tagline || '')}</p>
        </div>
        <div>
          <h5>Shop</h5>
          <ul>${CFG.categories.map(c => `<li><a href="#/category/${c.slug}">${escapeHtml(c.title)}</a></li>`).join('')}</ul>
        </div>
        <div>
          <h5>Company</h5>
          <ul>
            <li><a href="#/services">Services</a></li>
            <li><a href="#/contact">Contact</a></li>
            <li><a href="${waUrl}" target="_blank" rel="noopener">WhatsApp</a></li>
          </ul>
        </div>
        <div>
          <h5>Reach us</h5>
          <ul>
            <li><a href="${waUrl}" target="_blank" rel="noopener">Message on WhatsApp</a></li>
            <li>${escapeHtml(site.email || '')}</li>
            <li>Nigeria</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} Demira Store. All rights reserved.</span>
        <span>Secure payments by Paystack</span>
      </div>
    </div>`;

  $('#fabWa').setAttribute('href', waUrl);

  const nav = $('#sidenav'), overlay = $('#navOverlay');
  const openNav = () => { nav.classList.add('open'); overlay.classList.add('open'); document.body.classList.add('no-scroll'); };
  const closeNav = () => { nav.classList.remove('open'); overlay.classList.remove('open'); document.body.classList.remove('no-scroll'); };
  $('#btnMenu').addEventListener('click', openNav);
  $('#btnClose').addEventListener('click', closeNav);
  overlay.addEventListener('click', closeNav);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });
  nav.addEventListener('click', e => {
    if (e.target.closest('a[data-nav], #navShopBtn')) closeNav();
  });

  $('#fabTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ============ Router ============
function route() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean);
  window.scrollTo({ top: 0 });
  CFG.currentProduct = null;

  if (parts.length === 0) return renderHome();
  if (parts[0] === 'category' && parts[1]) return renderCategory(parts[1]);
  if (parts[0] === 'product' && parts[1]) return renderProduct(parts[1]);
  if (parts[0] === 'services') return renderServices();
  if (parts[0] === 'contact') return renderContact();
  return renderNotFound();
}

// ============ Home ============
function renderHome() {
  const site = CFG.site;
  setHead(`${site.name || 'Demira Store'} — Premium Laptops, Desktops & Smart Gadgets in Nigeria`,
    site.tagline || 'Shop laptops, desktops, smart gadgets, accessories and components. Free delivery across Nigeria, 30-day warranty and secure Paystack checkout.');

  const featured = CFG.products.filter(p => p.featured).slice(0, 6);
  const display = featured.length ? featured : CFG.products.slice(0, 6);

  $('#app').innerHTML = `
    <section class="home-hero">
      <div class="container">
        <span class="hero-eyebrow">Premium tech · Delivered nationwide</span>
        <h1 class="hero-title">${escapeHtml(site.hero_title || 'Powerful gadgets. Honest prices. Delivered across Nigeria.').replace(/Honest/i, '<em>Honest</em>')}</h1>
        <p class="hero-sub">${escapeHtml(site.hero_subtitle || '')}</p>
        <div class="hero-cta">
          <a href="#/category/laptops" class="btn btn-primary btn-lg">Shop Now</a>
          <a href="#/services" class="btn btn-outline btn-lg">Our Services</a>
        </div>
        <div class="hero-stats">
          <div class="hero-stat"><div class="n">${CFG.categories.length || 5}</div><div class="l">Categories</div></div>
          <div class="hero-stat"><div class="n">30-day</div><div class="l">Warranty</div></div>
          <div class="hero-stat"><div class="n">24 hrs</div><div class="l">Ships within</div></div>
        </div>
      </div>
    </section>

    <section class="section container reveal">
      <span class="eyebrow">What we do</span>
      <h2 class="section-title">A curated store for people who care about their tools.</h2>
      <p class="section-lede">${escapeHtml(site.about || '')}</p>
    </section>

    <section class="section container reveal">
      <span class="eyebrow">Categories</span>
      <h2 class="section-title">Shop by category</h2>
      <div class="cat-grid" style="margin-top:28px;">
        ${CFG.categories.map(c => `
          <a class="cat-card" href="#/category/${c.slug}">
            <div class="cat-ico">${c.icon || '·'}</div>
            <h3>${escapeHtml(c.title)}</h3>
            <p>${escapeHtml(c.tagline || '')}</p>
            <span class="cat-arrow">Explore ›</span>
          </a>`).join('')}
      </div>
    </section>

    <section class="section container reveal">
      <span class="eyebrow">Featured</span>
      <h2 class="section-title">Products worth your attention</h2>
      <div class="product-grid" style="margin-top:28px;">
        ${display.map(productCard).join('')}
      </div>
      <div style="text-align:center; margin-top:44px;">
        <a href="#/category/laptops" class="btn btn-outline">Browse all laptops</a>
      </div>
    </section>

    <section class="section container reveal">
      <span class="eyebrow">Why Demira Store</span>
      <h2 class="section-title">Built around trust.</h2>
      <div class="why-grid" style="margin-top:28px;">
        <div class="why-card"><div class="ico">🚚</div><h4>Free delivery</h4><p>We ship anywhere in Nigeria at no extra cost — Lagos in 24–48 hrs, other states in 3–7 business days.</p></div>
        <div class="why-card"><div class="ico">🛡</div><h4>30-day warranty</h4><p>Every product ships with a 30-day warranty covering functionality and hardware issues.</p></div>
        <div class="why-card"><div class="ico">💳</div><h4>Secure checkout</h4><p>Card, transfer, USSD or bank account — all processed securely by Paystack at checkout.</p></div>
        <div class="why-card"><div class="ico">💬</div><h4>Real humans</h4><p>WhatsApp us any time. We answer questions, help you choose, and follow every delivery through.</p></div>
      </div>
    </section>

    ${renderFaqSection()}
    ${renderCTASection()}
  `;
  observeReveal();
}

function productCard(p) {
  const oos = !p.in_stock;
  return `
    <a class="prod-card" href="#/product/${p.slug}">
      <div class="thumb">
        ${p.badge ? `<div class="badges"><span class="badge badge-gold">${escapeHtml(p.badge)}</span></div>` : (oos ? `<div class="badges"><span class="badge badge-oos">Out of stock</span></div>` : '')}
        <img src="${img(p.images[0])}" alt="${escapeHtml(p.title)}" loading="lazy" />
      </div>
      <div class="prod-body">
        <span class="prod-brand">${escapeHtml(p.brand || '')}</span>
        <h3 class="prod-title">${escapeHtml(p.title)}</h3>
        <p class="prod-sub">${escapeHtml(p.short_desc || '')}</p>
        <div class="prod-foot">
          <div class="prod-price">
            <span class="curr">${fmt(p.price)}</span>
            ${p.compare_price ? `<span class="orig">${fmt(p.compare_price)}</span>` : ''}
          </div>
          <span class="prod-cta">View ›</span>
        </div>
      </div>
    </a>`;
}

// ============ Category ============
function renderCategory(slug) {
  const cat = CFG.categories.find(c => c.slug === slug);
  if (!cat) return renderNotFound();
  const items = CFG.products.filter(p => p.category_slug === slug);
  setHead(`${cat.title} — Buy ${cat.title} in Nigeria | Demira Store`,
    `Shop ${cat.title.toLowerCase()} at Demira Store. ${cat.tagline || ''} Free delivery across Nigeria, 30-day warranty and secure Paystack checkout.`);

  $('#app').innerHTML = `
    <div class="container breadcrumbs">
      <a href="#/">Home</a><span class="sep">›</span><span>${escapeHtml(cat.title)}</span>
    </div>
    <section class="cat-hero container">
      <div class="ico">${cat.icon || '·'}</div>
      <span class="eyebrow">${escapeHtml(cat.title)}</span>
      <h1 class="section-title center" style="max-width:720px; margin-inline:auto;">${escapeHtml(cat.tagline || cat.title)}</h1>
      <p class="section-lede" style="margin-inline:auto;">${items.length} product${items.length !== 1 ? 's' : ''} available. Every unit is tested, priced fairly and shipped free anywhere in Nigeria.</p>
    </section>
    <section class="container" style="padding-bottom: clamp(48px, 8vw, 96px);">
      ${items.length ? `<div class="product-grid">${items.map(productCard).join('')}</div>`
        : `<p class="prose center">No products in this category yet — check back soon or <a href="#/contact" style="color:var(--gold-2);">contact us</a> for special orders.</p>`}
    </section>
    ${renderCTASection()}
  `;
  observeReveal();
}

// ============ Product Detail ============
function renderProduct(slug) {
  const p = CFG.products.find(x => x.slug === slug);
  if (!p) return renderNotFound();
  CFG.currentProduct = p;
  const cat = CFG.categories.find(c => c.slug === p.category_slug);

  setHead(`${p.title} — ${fmt(p.price)} | Demira Store Nigeria`,
    `${p.short_desc || ''} Buy the ${p.title} in Nigeria. Free delivery, 30-day warranty, secure Paystack checkout.`);
  injectProductLD(p);

  const overviewParagraphs = Array.isArray(p.overview)
    ? p.overview
    : (typeof p.overview === 'string' && p.overview.trim()
        ? (p.overview.trim().startsWith('[') ? safeJson(p.overview, []) : p.overview.split(/\n+/).filter(Boolean))
        : []);

  $('#app').innerHTML = `
    <div class="container breadcrumbs">
      <a href="#/">Home</a><span class="sep">›</span>
      <a href="#/category/${p.category_slug}">${escapeHtml(cat?.title || p.category_slug)}</a><span class="sep">›</span>
      <span>${escapeHtml(p.title)}</span>
    </div>

    <section class="container pdp-hero">
      <div class="gallery">
        <button class="gal-arrow gal-prev" aria-label="Previous image">&#8249;</button>
        <div class="gal-viewport"><div class="gal-track" id="galTrack"></div></div>
        <button class="gal-arrow gal-next" aria-label="Next image">&#8250;</button>
        <div class="gal-dots" id="galDots"></div>
        <div class="gal-thumbs" id="galThumbs"></div>
      </div>
      <div>
        ${p.badge ? `<span class="badge badge-olive">${escapeHtml(p.badge)}</span>` : ''}
        <h1 class="product-title">${escapeHtml(p.title)}</h1>
        <p class="product-subtitle">${escapeHtml(p.brand || '')}</p>
        <p class="product-desc">${escapeHtml(p.short_desc || '')}</p>
        <div class="price-block">
          <span class="price-current">${fmt(p.price)}</span>
          ${p.compare_price ? `<span class="price-original">${fmt(p.compare_price)}</span>` : ''}
          ${p.compare_price ? `<span class="price-save">Save ${fmt(p.compare_price - p.price)}</span>` : ''}
        </div>
        <div class="stock ${p.in_stock ? '' : 'oos'}"><span class="stock-dot"></span> ${p.in_stock ? 'In stock · Ships within 24 hours' : 'Currently out of stock'}</div>
        <div class="cta-group">
          ${p.in_stock ? `<button class="btn btn-primary btn-lg" data-buy>Place Your Order</button>` : `<button class="btn btn-outline btn-lg" disabled>Out of Stock</button>`}
          <a class="btn btn-outline btn-lg" href="${waLink(`Hi, I'm interested in the ${p.title}. Can you help me place an order?`)}" target="_blank" rel="noopener">Chat on WhatsApp</a>
        </div>
        <ul class="trust-strip">
          <li><span>🚚</span> Free delivery in Nigeria</li>
          <li><span>🛡</span> 30-day warranty</li>
          <li><span>💳</span> Secure Paystack checkout</li>
          <li><span>📦</span> Ships in 24 hours</li>
        </ul>
      </div>
    </section>

    ${p.highlights?.length ? `<section class="container section reveal">
      <div class="highlights">
        ${p.highlights.map(h => `<div class="hl-card"><div class="hl-icon">${h.icon || '·'}</div><div class="hl-val">${escapeHtml(h.value)}</div><div class="hl-lbl">${escapeHtml(h.label)}</div></div>`).join('')}
      </div>
    </section>` : ''}

    ${overviewParagraphs.length ? `<section class="container section narrow reveal">
      <h2 class="section-title">About the ${escapeHtml(p.title)}</h2>
      <div class="prose">${overviewParagraphs.map(t => `<p>${escapeHtml(t)}</p>`).join('')}</div>
    </section>` : ''}

    ${p.images[1] && p.display_specs?.length ? `<section class="container section reveal">
      <div class="split">
        <div class="split-media"><img src="${img(p.images[1])}" alt="${escapeHtml(p.title)} view" loading="lazy" /></div>
        <div>
          <h2 class="section-title">Display & design</h2>
          <ul class="spec-list">
            ${p.display_specs.map(row => Array.isArray(row) ? `<li><strong>${escapeHtml(row[0])}</strong><span>${escapeHtml(row[1])}</span></li>` : '').join('')}
          </ul>
        </div>
      </div>
    </section>` : ''}

    ${p.specs?.length ? `<section class="container section reveal">
      <h2 class="section-title center">Full Specifications</h2>
      <div class="spec-table-wrap" style="margin-top:28px;"><table class="spec-table"><tbody>
        ${p.specs.map(row => Array.isArray(row) ? `<tr><th>${escapeHtml(row[0])}</th><td>${escapeHtml(row[1])}</td></tr>` : '').join('')}
      </tbody></table></div>
    </section>` : ''}

    ${renderRelated(p)}
    ${renderFaqSection()}
    ${renderCTASection()}
  `;

  initGallery(p);
  observeReveal();
  if (p.in_stock) setupMobileBuy(p);
}

function safeJson(s, d) { try { return JSON.parse(s); } catch { return d; } }

function renderRelated(p) {
  const related = CFG.products.filter(x => x.category_slug === p.category_slug && x.slug !== p.slug).slice(0, 3);
  if (!related.length) return '';
  return `<section class="container section reveal">
    <span class="eyebrow">You might also like</span>
    <h2 class="section-title">More from this collection</h2>
    <div class="product-grid" style="margin-top:28px;">${related.map(productCard).join('')}</div>
  </section>`;
}

// ============ Services ============
function renderServices() {
  setHead('Our Services — Demira Store',
    CFG.site.services_intro || 'Discover the services we offer.');

  $('#app').innerHTML = `
    <div class="container breadcrumbs"><a href="#/">Home</a><span class="sep">›</span><span>Services</span></div>
    <section class="section container reveal">
      <span class="eyebrow">What we do</span>
      <h2 class="section-title">Services designed to make tech easy.</h2>
      <p class="section-lede">${escapeHtml(CFG.site.services_intro || '')}</p>
    </section>

    <section class="section container reveal" style="padding-top:0;">
      <div class="svc-grid">
        <div class="svc-card"><div class="svc-ico">💻</div><h3>Curated Sales</h3><p>Hand-picked laptops, desktops and gadgets across trusted brands — no random inventory, no guesswork.</p></div>
        <div class="svc-card"><div class="svc-ico">🚚</div><h3>Nationwide Delivery</h3><p>Free delivery to every state in Nigeria. Lagos in 24–48 hrs, other states in 3–7 business days.</p></div>
        <div class="svc-card"><div class="svc-ico">🛠</div><h3>30-Day Warranty</h3><p>Every unit ships with a warranty on functionality and hardware. If something's wrong, we make it right.</p></div>
        <div class="svc-card"><div class="svc-ico">🎯</div><h3>Buying Advisory</h3><p>Tell us your budget and use case — we recommend the best fit and answer every question before you buy.</p></div>
        <div class="svc-card"><div class="svc-ico">💳</div><h3>Secure Checkout</h3><p>Pay with card, transfer, USSD or bank account. Every transaction is protected by Paystack.</p></div>
        <div class="svc-card"><div class="svc-ico">💬</div><h3>Human Support</h3><p>WhatsApp us any time. Real people who know the products, ready to help before and after your order.</p></div>
      </div>
    </section>

    <section class="section container narrow reveal">
      <h2 class="section-title">How it works</h2>
      <div class="prose">
        <p><strong>1. Browse or ask.</strong> Explore our categories or send us a WhatsApp with what you need — we'll suggest the right options.</p>
        <p><strong>2. Order securely.</strong> Add to cart and pay through Paystack, or confirm your order on WhatsApp. Your details stay private.</p>
        <p><strong>3. Ships in 24 hours.</strong> Once payment is confirmed, we dispatch within a day. You'll receive tracking updates.</p>
        <p><strong>4. Warranty and support.</strong> Get 30 days of coverage on every purchase and lifetime access to our support team.</p>
      </div>
    </section>

    ${renderCTASection()}
  `;
  observeReveal();
}

// ============ Contact ============
function renderContact() {
  setHead('Contact Us — Demira Store',
    'Get in touch with Demira Store. Message us or WhatsApp — we respond fast and help with orders, questions and support.');
  const site = CFG.site;
  const waUrl = waLink('Hi, I have a question about your store.');

  $('#app').innerHTML = `
    <div class="container breadcrumbs"><a href="#/">Home</a><span class="sep">›</span><span>Contact</span></div>

    <section class="section container reveal">
      <span class="eyebrow">Reach us</span>
      <h2 class="section-title">We answer fast — and honestly.</h2>
      <p class="section-lede">${escapeHtml(site.contact_intro || '')}</p>
    </section>

    <section class="section container split-2 reveal" style="padding-top:0;">
      <form class="form" id="contactForm" novalidate autocomplete="on">
        <input type="checkbox" name="botcheck" class="honeypot" tabindex="-1" autocomplete="off" />
        <label>Full name
          <input type="text" name="name" required minlength="2" placeholder="Your full name" />
          <span class="field-err"></span>
        </label>
        <label>Email
          <input type="email" name="email" required placeholder="you@example.com" />
          <span class="field-err"></span>
        </label>
        <label>Phone
          <input type="tel" name="phone" required placeholder="+234…" />
          <span class="field-err"></span>
        </label>
        <label>Subject
          <input type="text" name="subject" placeholder="How can we help?" />
          <span class="field-err"></span>
        </label>
        <label>Message
          <textarea name="message" rows="5" required minlength="10" placeholder="Tell us a bit about what you need…"></textarea>
          <span class="field-err"></span>
        </label>
        <button type="submit" class="btn btn-primary btn-lg">Send Message</button>
        <div class="form-msg" id="formMsg"></div>
      </form>

      <aside class="contact-info">
        <h3>Reach us directly</h3>
        <ul>
          <li><span>💬</span><div><div class="lbl">WhatsApp</div><a href="${waUrl}" target="_blank" rel="noopener">Chat with us</a></div></li>
          <li><span>✉️</span><div><div class="lbl">Email</div>${escapeHtml(site.email || '')}</div></li>
          <li><span>📍</span><div><div class="lbl">We serve</div>All 36 states across Nigeria</div></li>
          <li><span>⏰</span><div><div class="lbl">Hours</div>Mon–Sat, 9:00 AM – 7:00 PM</div></li>
        </ul>
      </aside>
    </section>

    ${renderFaqSection()}
  `;
  attachContactForm();
  observeReveal();
}

// ============ Shared partials ============
function renderFaqSection() {
  if (!CFG.faqs?.length) return '';
  return `<section class="section container reveal">
    <span class="eyebrow" style="display:block; text-align:center;">FAQs</span>
    <h2 class="section-title center">Answers to common questions</h2>
    <div class="faq" style="margin-top:28px;">
      ${CFG.faqs.map(f => `<details class="faq-item"><summary>${escapeHtml(f.q)}</summary><div class="a">${escapeHtml(f.a)}</div></details>`).join('')}
    </div>
  </section>`;
}

function renderCTASection() {
  return `<section class="section container reveal">
    <div style="background:var(--ink); color:var(--cream); border-radius: var(--radius-xl); padding: clamp(40px, 7vw, 72px); text-align:center;">
      <h2 class="section-title center" style="color:var(--cream); margin-inline:auto;">Ready to upgrade your setup?</h2>
      <p style="color:rgba(251,247,238,.75); max-width:520px; margin: 12px auto 28px;">Explore our full catalog or send a WhatsApp — we'll help you find the right fit.</p>
      <div style="display:inline-flex; gap:12px; flex-wrap:wrap; justify-content:center;">
        <a href="#/category/laptops" class="btn btn-gold btn-lg">Shop Now</a>
        <a href="${waLink('Hi, I need some buying advice.')}" target="_blank" rel="noopener" class="btn btn-outline btn-lg" style="color:var(--cream); border-color:var(--cream);">WhatsApp us</a>
      </div>
    </div>
  </section>`;
}

function renderNotFound() {
  setHead('Not found — Demira Store', 'This page could not be found.');
  $('#app').innerHTML = `<section class="section container" style="text-align:center;">
    <h1 class="section-title center" style="margin-inline:auto;">Page not found</h1>
    <p class="section-lede" style="margin: 12px auto 28px;">The page you're looking for doesn't exist.</p>
    <a href="#/" class="btn btn-primary">Back to home</a>
  </section>`;
}

// ============ Gallery ============
function initGallery(p) {
  const track = $('#galTrack'), dotsEl = $('#galDots'), thumbsEl = $('#galThumbs');
  const images = p.images || [];
  if (!images.length) { track.parentElement.parentElement.innerHTML = ''; return; }
  let current = 0;
  images.forEach((src, i) => {
    const slide = document.createElement('div'); slide.className = 'gal-slide';
    const im = document.createElement('img'); im.src = img(src); im.alt = `${p.title} — view ${i + 1}`;
    if (i > 0) im.loading = 'lazy';
    im.addEventListener('click', () => openLightbox(img(src)));
    slide.appendChild(im); track.appendChild(slide);
    const dot = document.createElement('button'); dot.className = 'gal-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Go to image ${i + 1}`); dot.addEventListener('click', () => goTo(i)); dotsEl.appendChild(dot);
    const th = document.createElement('button'); th.className = 'gal-thumb' + (i === 0 ? ' active' : '');
    th.innerHTML = `<img src="${img(src)}" alt="" loading="lazy" />`;
    th.addEventListener('click', () => goTo(i)); thumbsEl.appendChild(th);
  });
  function goTo(i) {
    current = (i + images.length) % images.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    dotsEl.querySelectorAll('.gal-dot').forEach((d, idx) => d.classList.toggle('active', idx === current));
    thumbsEl.querySelectorAll('.gal-thumb').forEach((t, idx) => t.classList.toggle('active', idx === current));
  }
  $('.gal-prev').addEventListener('click', () => goTo(current - 1));
  $('.gal-next').addEventListener('click', () => goTo(current + 1));
  let sx = 0, dx = 0;
  track.addEventListener('touchstart', e => { sx = e.touches[0].clientX; dx = 0; }, { passive: true });
  track.addEventListener('touchmove', e => { dx = e.touches[0].clientX - sx; }, { passive: true });
  track.addEventListener('touchend', () => { if (Math.abs(dx) > 45) goTo(current + (dx < 0 ? 1 : -1)); });

  document.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => openCheckout(p)));
}

function openLightbox(src) {
  let lb = $('#lightbox');
  if (!lb) {
    lb = document.createElement('div'); lb.id = 'lightbox'; lb.className = 'lightbox';
    lb.innerHTML = `<button class="lb-close" aria-label="Close">✕</button><img id="lbImg" alt="" />`;
    document.body.appendChild(lb);
    lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lb-close')) lb.classList.remove('open'); });
  }
  $('#lbImg').src = src; lb.classList.add('open');
}

// ============ Checkout ============
function openCheckout(p) {
  let modal = $('#checkoutModal');
  if (!modal) {
    modal = document.createElement('div'); modal.id = 'checkoutModal'; modal.className = 'modal';
    modal.innerHTML = `<div class="modal-card">
      <button class="modal-close" aria-label="Close">✕</button>
      <h3>Complete your order</h3>
      <p class="sub" id="chkSub"></p>
      <form class="form" id="checkoutForm" novalidate autocomplete="on">
        <label>Full name<input name="name" required minlength="2" placeholder="Your full name" /><span class="field-err"></span></label>
        <label>Email<input type="email" name="email" required placeholder="you@example.com" /><span class="field-err"></span></label>
        <label>Phone<input type="tel" name="phone" required placeholder="+234…" /><span class="field-err"></span></label>
        <label>Delivery address<textarea name="address" required minlength="6" rows="3" placeholder="Street, city, state"></textarea><span class="field-err"></span></label>
        <button type="submit" class="btn btn-primary btn-lg btn-block">Pay Securely with Paystack</button>
        <div class="form-msg" id="checkoutMsg"></div>
      </form></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal || e.target.classList.contains('modal-close')) modal.classList.remove('open'); });
  }
  $('#chkSub').textContent = `${p.title} — ${fmt(p.price)}`;
  const form = $('#checkoutForm');
  attachLiveValidation(form);
  form.onsubmit = e => {
    e.preventDefault();
    const msg = $('#checkoutMsg'); msg.textContent = ''; msg.className = 'form-msg';
    if (!validateForm(form)) { msg.textContent = 'Please fix the errors above.'; msg.className = 'form-msg err'; return; }
    const fd = new FormData(form);
    const customer = {
      name: fd.get('name').toString().trim(),
      email: fd.get('email').toString().trim(),
      phone: fd.get('phone').toString().trim(),
      address: fd.get('address').toString().trim(),
    };
    payWithPaystack(customer, p, msg);
  };
  modal.classList.add('open');
}

function payWithPaystack(customer, p, msg) {
  if (typeof PaystackPop === 'undefined') { msg.textContent = 'Payment library still loading — please try again.'; msg.className = 'form-msg err'; return; }
  const key = CFG.site.paystack_key;
  if (!key) { msg.textContent = 'Payment is not yet configured. Please contact us on WhatsApp.'; msg.className = 'form-msg err'; return; }
  msg.textContent = 'Opening secure Paystack checkout…';
  const paystack = new PaystackPop();
  paystack.newTransaction({
    key,
    email: customer.email,
    amount: Math.round(Number(p.price) * 100),
    currency: 'NGN',
    reference: 'DEMIRA_' + Math.floor(Math.random() * 1e10),
    metadata: {
      product: p.title,
      custom_fields: [
        { display_name: 'Product', variable_name: 'product', value: p.title },
        { display_name: 'Name', variable_name: 'name', value: customer.name },
        { display_name: 'Phone', variable_name: 'phone', value: customer.phone },
        { display_name: 'Address', variable_name: 'address', value: customer.address },
      ]
    },
    onSuccess: t => {
      $('#checkoutModal').classList.remove('open');
      alert('Payment successful. Reference: ' + t.reference + '. We will contact you shortly to arrange delivery.');
    },
    onCancel: () => { msg.textContent = 'Payment cancelled. You can try again any time.'; msg.className = 'form-msg err'; }
  });
}

// ============ Contact form (Web3Forms) ============
function attachContactForm() {
  const form = $('#contactForm'), msg = $('#formMsg');
  attachLiveValidation(form);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    msg.textContent = ''; msg.className = 'form-msg';
    if (!validateForm(form)) { msg.textContent = 'Please fix the errors above.'; msg.className = 'form-msg err'; return; }
    const bot = form.querySelector('input[name="botcheck"]');
    if (bot && bot.checked) return;
    const btn = form.querySelector('button[type="submit"]'); const t = btn.textContent;
    btn.disabled = true; btn.textContent = 'Sending…';
    const fd = new FormData();
    fd.append('access_key', CFG.site.web3forms_key || '');
    fd.append('subject', form.subject.value.trim() || 'New Message from Demira Store');
    fd.append('from_name', 'Demira Store Website');
    fd.append('name', form.name.value.trim());
    fd.append('email', form.email.value.trim());
    fd.append('phone', form.phone.value.trim());
    fd.append('message', form.message.value.trim());
    try {
      const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: fd, headers: { 'Accept': 'application/json' } });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        form.reset(); clearFormErrors(form);
        msg.textContent = '✓ Message sent — we\'ll get back to you within a few hours.'; msg.className = 'form-msg ok';
      } else {
        msg.textContent = data.message || 'Something went wrong. Please try again or WhatsApp us.'; msg.className = 'form-msg err';
      }
    } catch (err) {
      msg.textContent = 'Network error. Please try again or WhatsApp us.'; msg.className = 'form-msg err';
    } finally {
      btn.disabled = false; btn.textContent = t;
    }
  });
}

// ============ Validation ============
function setFieldError(input, message) {
  input.classList.toggle('invalid', !!message);
  const err = input.closest('label')?.querySelector('.field-err');
  if (err) err.textContent = message || '';
}
function clearFormErrors(form) {
  form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
  form.querySelectorAll('.field-err').forEach(el => el.textContent = '');
}
function validateField(input) {
  const name = input.name, value = (input.value || '').trim();
  if (input.required && !value) return 'This field is required.';
  if (value) {
    if (input.type === 'email' && !EMAIL_RE.test(value)) return 'Enter a valid email address.';
    if (input.type === 'tel' && !PHONE_RE.test(value)) return 'Enter a valid phone number.';
    if (name === 'name' && value.length < 2) return 'Please enter your full name.';
    if (name === 'message' && value.length < 10) return 'Message must be at least 10 characters.';
    if (name === 'address' && value.length < 6) return 'Please enter a complete delivery address.';
  }
  return '';
}
function validateForm(form) {
  let firstBad = null;
  form.querySelectorAll('input, textarea').forEach(input => {
    if (input.type === 'hidden' || input.type === 'checkbox' || input.classList.contains('honeypot')) return;
    const msg = validateField(input); setFieldError(input, msg);
    if (msg && !firstBad) firstBad = input;
  });
  if (firstBad) firstBad.focus();
  return !firstBad;
}
function attachLiveValidation(form) {
  form.querySelectorAll('input, textarea').forEach(input => {
    if (input.type === 'hidden' || input.type === 'checkbox' || input.classList.contains('honeypot')) return;
    input.addEventListener('blur', () => setFieldError(input, validateField(input)));
    input.addEventListener('input', () => { if (input.classList.contains('invalid')) setFieldError(input, validateField(input)); });
  });
}

// ============ Reveal / scroll ============
function observeReveal() {
  if (!('IntersectionObserver' in window)) { $$('.reveal').forEach(el => el.classList.add('in')); return; }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: .12 });
  $$('.reveal').forEach(el => io.observe(el));
}

function onScroll() {
  const header = $('#site-header'), fab = $('#fabTop'), mb = $('#mobileBuy');
  if (header) header.classList.toggle('scrolled', window.scrollY > 6);
  if (fab) fab.classList.toggle('show', window.scrollY > 400);
  if (mb && CFG.currentProduct) {
    const show = window.scrollY > 600 && window.innerWidth < 1024;
    mb.classList.toggle('show', show);
    document.body.classList.toggle('has-mobile-buy', show);
  } else if (mb) {
    mb.classList.remove('show'); document.body.classList.remove('has-mobile-buy');
  }
}

function setupMobileBuy(p) {
  const mb = $('#mobileBuy');
  mb.innerHTML = `<div class="m-price">${fmt(p.price)}</div>
    <button class="btn btn-primary" data-buy>Place Your Order</button>`;
  mb.querySelector('[data-buy]').addEventListener('click', () => openCheckout(p));
}

// ============ Head + SEO ============
function setHead(title, desc) {
  document.title = title;
  setMeta('description', desc);
  setMeta('og:title', title, true);
  setMeta('og:description', desc, true);
  setMeta('twitter:title', title);
  setMeta('twitter:description', desc);
}
function setMeta(name, content, prop = false) {
  const attr = prop ? 'property' : 'name';
  let m = document.querySelector(`meta[${attr}="${name}"]`);
  if (!m) { m = document.createElement('meta'); m.setAttribute(attr, name); document.head.appendChild(m); }
  m.setAttribute('content', content);
}
function injectProductLD(p) {
  const old = document.getElementById('productLD'); if (old) old.remove();
  const s = document.createElement('script');
  s.type = 'application/ld+json'; s.id = 'productLD';
  s.textContent = JSON.stringify({
    "@context": "https://schema.org", "@type": "Product",
    name: p.title, image: (p.images || []).map(i => img(i)), description: p.short_desc,
    brand: { "@type": "Brand", name: p.brand || 'Demira Store' },
    offers: {
      "@type": "Offer", priceCurrency: "NGN", price: String(p.price),
      availability: p.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "Demira Store" }
    }
  });
  document.head.appendChild(s);
}

function waLink(text) {
  const phone = CFG.site.wa_phone || '2349059639220';
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

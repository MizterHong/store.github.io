'use strict';

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function getStorage(key, fallback) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; }
}
function setStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/* ---- TOAST ---- */
function showToast(msg) {
  let t = $('.cart-toast');
  if (!t) { t = document.createElement('div'); t.className = 'cart-toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ---- NAVBAR ---- */
function initNavbar() {
  const navbar = $('.navbar');
  if (!navbar) return;
  const hamburger = $('#hamburger');
  const navMenu = $('#navMenu');
  const overlay = $('#navOverlay');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });

  function closeMenu() {
    hamburger && hamburger.classList.remove('active');
    navMenu && navMenu.classList.remove('open');
    overlay && overlay.classList.remove('show');
    document.body.style.overflow = '';
  }

  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      const open = navMenu.classList.toggle('open');
      hamburger.classList.toggle('active', open);
      overlay && overlay.classList.toggle('show', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
  }

  overlay && overlay.addEventListener('click', closeMenu);
  $$('.nav-link').forEach(l => l.addEventListener('click', closeMenu));

  // Auto-highlight active link
  const page = window.location.pathname.split('/').pop() || 'index.html';
  $$('.nav-link').forEach(l => {
    if (l.getAttribute('href') === page) l.classList.add('active');
  });
}

/* ---- CART ---- */
function initCart() {
  let cart = getStorage('velour_cart', []);

  function updateUI() {
    const total = cart.reduce((s, i) => s + i.qty, 0);
    $$('.cart-count').forEach(el => {
      el.textContent = total;
      el.classList.toggle('hidden', total === 0);
    });
  }

  function addToCart(id, name, price) {
    cart = getStorage('velour_cart', []);
    const ex = cart.find(i => i.id === id);
    ex ? ex.qty++ : cart.push({ id, name, price, qty: 1 });
    setStorage('velour_cart', cart);
    updateUI();
    showToast(`"${name}" added to cart 🛍️`);
  }

  $$('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', function () {
      const card = this.closest('.product-card');
      const id = card?.dataset.id || Math.random().toString(36).slice(2);
      const name = card?.querySelector('.product-name')?.textContent || 'Item';
      const price = card?.querySelector('.price-current')?.textContent || '$0';
      addToCart(id, name, price);
      const orig = this.innerHTML;
      this.innerHTML = '✓ Added';
      this.classList.add('added');
      setTimeout(() => { this.innerHTML = orig; this.classList.remove('added'); }, 1500);
    });
  });

  updateUI();
}

/* ---- WISHLIST ---- */
function initWishlist() {
  let wl = getStorage('velour_wishlist', []);

  function updateUI() {
    $$('.wishlist-btn').forEach(btn => {
      const id = btn.closest('.product-card')?.dataset.id;
      const active = id && wl.includes(id);
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.textContent = active ? '♥' : '♡';
    });
  }

  $$('.wishlist-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      wl = getStorage('velour_wishlist', []);
      const id = this.closest('.product-card')?.dataset.id;
      if (!id) return;
      if (wl.includes(id)) { wl = wl.filter(i => i !== id); showToast('Removed from wishlist'); }
      else { wl.push(id); showToast('Added to wishlist ♥'); }
      setStorage('velour_wishlist', wl);
      updateUI();
    });
  });

  updateUI();
}

/* ---- SCROLL TO TOP ---- */
function initScrollTop() {
  const btn = $('.scroll-top');
  if (!btn) return;
  window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 400), { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ---- SMOOTH SCROLL ---- */
function initSmoothScroll() {
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function (e) {
      const t = $(this.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });
}

/* ---- CATEGORY FILTER & SORT ---- */
function initCategoryFilter() {
  const tabs = $$('.filter-tab');
  const cards = $$('.product-card[data-category]');
  const countEl = $('.product-count');
  const sortSel = $('.sort-select');
  if (!tabs.length) return;

  let currentFilter = 'all';

  function updateCount() {
    const n = $$('.product-card[data-category]:not(.hidden)').length;
    if (countEl) countEl.textContent = `Showing ${n} product${n !== 1 ? 's' : ''}`;
  }

  function filter(f) {
    currentFilter = f;
    cards.forEach(c => c.classList.toggle('hidden', f !== 'all' && c.dataset.category !== f));
    updateCount();
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', function () {
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      filter(this.dataset.filter || 'all');
    });
  });

  if (sortSel) {
    sortSel.addEventListener('change', function () {
      const grid = $('.shop-products-grid');
      if (!grid) return;
      const items = $$('.product-card[data-category]', grid);
      items.sort((a, b) => {
        const pa = parseFloat(a.querySelector('.price-current')?.textContent.replace(/[^0-9.]/g, '') || 0);
        const pb = parseFloat(b.querySelector('.price-current')?.textContent.replace(/[^0-9.]/g, '') || 0);
        const na = a.querySelector('.product-name')?.textContent || '';
        const nb = b.querySelector('.product-name')?.textContent || '';
        if (this.value === 'price-low') return pa - pb;
        if (this.value === 'price-high') return pb - pa;
        if (this.value === 'name-asc') return na.localeCompare(nb);
        if (this.value === 'name-desc') return nb.localeCompare(na);
        return 0;
      });
      items.forEach(c => grid.appendChild(c));
      filter(currentFilter);
    });
  }

  updateCount();
}

/* ---- CONTACT FORM ---- */
function initContactForm() {
  const form = $('#contactForm');
  if (!form) return;

  function check(input) {
    const g = input.closest('.form-group');
    if (!g) return true;
    const v = input.value.trim();
    const err = g.querySelector('.error-msg');
    const setErr = (msg) => { g.classList.add('has-error'); if (err) err.textContent = msg; return false; };
    const clr = () => { g.classList.remove('has-error'); return true; };
    if (input.required && !v) return setErr('This field is required.');
    if (input.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setErr('Enter a valid email address.');
    if (input.name === 'message' && v.length < 10) return setErr('Message must be at least 10 characters.');
    return clr();
  }

  $$('input,textarea', form).forEach(i => {
    i.addEventListener('blur', () => check(i));
    i.addEventListener('input', () => { if (i.closest('.form-group')?.classList.contains('has-error')) check(i); });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    $$('input[required],textarea[required]', form).forEach(i => { if (!check(i)) ok = false; });
    if (ok) {
      const s = $('#contactSuccess');
      if (s) { s.classList.add('show'); form.reset(); setTimeout(() => s.classList.remove('show'), 5000); }
    }
  });
}

/* ---- AUTH FORMS ---- */
function initAuthForms() {
  const tabs = $$('.auth-tab');
  const forms = $$('.auth-form');
  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', function () {
      tabs.forEach(t => t.classList.remove('active'));
      forms.forEach(f => f.classList.remove('active'));
      this.classList.add('active');
      const t = $(`#${this.dataset.tab}Form`);
      if (t) t.classList.add('active');
    });
  });

  function checkField(input) {
    const g = input.closest('.form-group');
    if (!g) return true;
    const v = input.value.trim();
    let err = g.querySelector('.error-msg');
    if (!err) { err = document.createElement('span'); err.className = 'error-msg'; g.appendChild(err); }
    const setErr = (msg) => { g.classList.add('has-error'); err.textContent = msg; err.style.display = 'block'; return false; };
    const clr = () => { g.classList.remove('has-error'); err.style.display = 'none'; return true; };
    if (!v) return setErr('This field is required.');
    if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setErr('Enter a valid email address.');
    if (input.type === 'password' && v.length < 6) return setErr('Password must be at least 6 characters.');
    if (input.name === 'confirmPassword') {
      const pw = $('#registerForm input[name="password"]');
      if (pw && v !== pw.value) return setErr('Passwords do not match.');
    }
    return clr();
  }

  const loginForm = $('#loginForm');
  if (loginForm) {
    $$('input', loginForm).forEach(i => i.addEventListener('blur', () => checkField(i)));
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      let ok = true;
      $$('input[required]', loginForm).forEach(i => { if (!checkField(i)) ok = false; });
      if (ok) { showToast('Welcome back! 👋'); setTimeout(() => window.location.href = 'index.html', 1500); }
    });
  }

  const regForm = $('#registerForm');
  if (regForm) {
    $$('input', regForm).forEach(i => i.addEventListener('blur', () => checkField(i)));
    regForm.addEventListener('submit', e => {
      e.preventDefault();
      let ok = true;
      $$('input[required]', regForm).forEach(i => { if (!checkField(i)) ok = false; });
      if (ok) { showToast('Account created! Welcome to VELOUR 🎉'); setTimeout(() => window.location.href = 'index.html', 1800); }
    });
  }

  $$('.social-auth-btn').forEach(btn => {
    btn.addEventListener('click', function () { showToast(`Connecting with ${this.dataset.provider}...`); });
  });
}

/* ---- NEWSLETTER ---- */
function initNewsletter() {
  $$('.newsletter-form').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      const v = input?.value?.trim() || '';
      if (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { showToast('Please enter a valid email address.'); return; }
      showToast('Thank you for subscribing! 🎉');
      form.reset();
    });
  });
}

/* ---- SCROLL ANIMATIONS ---- */
function initScrollAnimations() {
  if (!('IntersectionObserver' in window)) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.style.opacity = '1'; en.target.style.transform = 'translateY(0)'; obs.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  $$('.feature-card,.product-card,.testimonial-card,.team-card,.why-card,.stat-item,.contact-info-card,.mv-card').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = `opacity 0.5s ease ${i * 0.06}s, transform 0.5s ease ${i * 0.06}s`;
    obs.observe(el);
  });
}

/* ---- HERO SLIDESHOW ---- */
function initSlider() {
  const slides = $$('.slide');
  const dots   = $$('.dot');
  if (!slides.length) return;

  let current  = 0;
  let timer    = null;
  const DELAY  = 5000; // ms between auto-slides

  function goTo(index) {
    slides[current].classList.remove('active');
    dots[current] && dots[current].classList.remove('active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current] && dots[current].classList.add('active');
    resetTimer();
  }

  function resetTimer() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), DELAY);
  }

  // Arrow buttons
  const prev = $('.slider-prev');
  const next = $('.slider-next');
  prev && prev.addEventListener('click', () => goTo(current - 1));
  next && next.addEventListener('click', () => goTo(current + 1));

  // Dots
  dots.forEach(dot => {
    dot.addEventListener('click', function () { goTo(+this.dataset.index); });
  });

  // Touch / swipe support
  let touchStartX = 0;
  const slider = $('.hero-slider');
  if (slider) {
    slider.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
    slider.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) goTo(diff > 0 ? current + 1 : current - 1);
    }, { passive: true });
  }

  // Pause on hover
  slider && slider.addEventListener('mouseenter', () => clearInterval(timer));
  slider && slider.addEventListener('mouseleave', resetTimer);

  // Keyboard support
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  });

  resetTimer();
}

/* ---- INIT ---- */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initSlider();
  initCart();
  initWishlist();
  initScrollTop();
  initSmoothScroll();
  initCategoryFilter();
  initContactForm();
  initAuthForms();
  initNewsletter();
  setTimeout(initScrollAnimations, 100);
});

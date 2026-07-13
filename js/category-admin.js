'use strict';
/* Injects admin-added products into the category page */

(function () {
  const STORAGE_KEY = 'velour_admin_products';

  function getAdminProducts() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  }

  function categoryLabel(cat) {
    const map = { men: "Men's", women: "Women's", kids: 'Kids', sale: 'Sale' };
    return map[cat] || cat;
  }

  function badgeClass(badge) {
    const map = { new: 'new', trending: 'trending', bestseller: 'bestseller', sale: 'sale' };
    return map[(badge || '').toLowerCase()] || '';
  }

  function buildCard(p) {
    const badge = p.badge
      ? `<span class="product-badge ${p.badge.toLowerCase() === 'sale' ? 'sale' : ''}">${p.badge}</span>` : '';
    const origPrice = p.original
      ? `<span class="price-original">$${parseFloat(p.original).toFixed(2)}</span>` : '';

    return `
      <div class="product-card" data-id="${p.id}" data-category="${p.category}">
        <div class="product-image">
          <img src="${p.image}" alt="${p.name}"
            style="width:100%;height:100%;object-fit:cover;display:block;"
            onerror="this.parentElement.innerHTML='<div class=product-img-placeholder style=background:linear-gradient(135deg,#667eea,#764ba2)>👗</div>';" />
          ${badge}
          <button class="wishlist-btn" aria-label="Add to wishlist" aria-pressed="false">♡</button>
        </div>
        <div class="product-info">
          <div class="product-category">${categoryLabel(p.category)}</div>
          <h3 class="product-name">${p.name}</h3>
          ${p.desc ? `<p style="font-size:0.78rem;color:#888;margin-bottom:8px;line-height:1.4;">${p.desc}</p>` : ''}
          <div class="product-price">
            <span class="price-current">$${parseFloat(p.price).toFixed(2)}</span>
            ${origPrice}
          </div>
          <button class="add-to-cart">🛍️ Add to Cart</button>
        </div>
      </div>`;
  }

  function init() {
    const products = getAdminProducts();
    if (!products.length) return;

    const banner = document.getElementById('adminProductsBanner');
    const adminGrid = document.getElementById('adminProductsGrid');
    if (!adminGrid) return;

    // Populate admin grid
    adminGrid.innerHTML = products.map(buildCard).join('');
    adminGrid.style.display = 'grid';
    if (banner) banner.style.display = 'block';

    // Re-init cart & wishlist for newly injected cards
    // (main.js runs first so we manually re-bind here)
    adminGrid.querySelectorAll('.add-to-cart').forEach(btn => {
      btn.addEventListener('click', function () {
        const card = this.closest('.product-card');
        const id = card?.dataset.id || Math.random().toString(36).slice(2);
        const name = card?.querySelector('.product-name')?.textContent || 'Item';
        const price = card?.querySelector('.price-current')?.textContent || '$0';

        // Use cart from localStorage
        let cart = [];
        try { cart = JSON.parse(localStorage.getItem('velour_cart')) || []; } catch {}
        const ex = cart.find(i => i.id === id);
        ex ? ex.qty++ : cart.push({ id, name, price, qty: 1 });
        localStorage.setItem('velour_cart', JSON.stringify(cart));

        // Update counter
        const total = cart.reduce((s, i) => s + i.qty, 0);
        document.querySelectorAll('.cart-count').forEach(el => {
          el.textContent = total;
          el.classList.toggle('hidden', total === 0);
        });

        // Toast
        let t = document.querySelector('.cart-toast');
        if (!t) {
          t = document.createElement('div');
          t.className = 'cart-toast';
          document.body.appendChild(t);
        }
        t.textContent = `"${name}" added to cart 🛍️`;
        t.classList.add('show');
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.classList.remove('show'), 2800);

        const orig = this.innerHTML;
        this.innerHTML = '✓ Added';
        this.classList.add('added');
        setTimeout(() => { this.innerHTML = orig; this.classList.remove('added'); }, 1500);
      });
    });

    // Wishlist
    adminGrid.querySelectorAll('.wishlist-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        let wl = [];
        try { wl = JSON.parse(localStorage.getItem('velour_wishlist')) || []; } catch {}
        const id = this.closest('.product-card')?.dataset.id;
        if (!id) return;
        if (wl.includes(id)) {
          wl = wl.filter(i => i !== id);
          this.textContent = '♡'; this.classList.remove('active');
        } else {
          wl.push(id);
          this.textContent = '♥'; this.classList.add('active');
        }
        localStorage.setItem('velour_wishlist', JSON.stringify(wl));
      });
    });

    // Make filter tabs also filter admin products
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', function () {
        const f = this.dataset.filter || 'all';
        adminGrid.querySelectorAll('.product-card').forEach(card => {
          card.classList.toggle('hidden', f !== 'all' && card.dataset.category !== f);
        });
      });
    });
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

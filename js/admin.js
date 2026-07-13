'use strict';

/* =============================================
   VELOUR Admin Panel - JavaScript
   ============================================= */

const STORAGE_KEY = 'velour_admin_products';

// ---- Helpers ----
const $ = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];

function getProducts() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}
function saveProducts(p) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}
function generateId() {
  return 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

// ---- NAVIGATION ----
function initNav() {
  const allLinks = $$('.sidebar-link[data-section], .btn-admin-primary[data-section], .qa-btn[data-section], .nav-to[data-section]');
  const sections = $$('.admin-section');
  const sidebarLinks = $$('.sidebar-link[data-section]');
  const title = $('#topbarTitle');

  function goTo(sectionId) {
    sections.forEach(s => s.classList.remove('active'));
    sidebarLinks.forEach(l => l.classList.remove('active'));
    const target = $(`#section-${sectionId}`);
    if (target) target.classList.add('active');
    const activeLink = $(`.sidebar-link[data-section="${sectionId}"]`);
    if (activeLink) activeLink.classList.add('active');
    if (title) title.textContent = sectionId.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
    // Close mobile sidebar
    $('#adminSidebar')?.classList.remove('open');
    // Refresh list when navigating to products
    if (sectionId === 'products') renderTable();
    if (sectionId === 'dashboard') renderDashboard();
    // Reset form when navigating to add-product
    if (sectionId === 'add-product') {
      const editIdx = $('#editIndex');
      if (editIdx && editIdx.value === '') resetForm();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  allLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      goTo(this.dataset.section);
    });
  });

  // Mobile sidebar toggle
  $('#topbarMenu')?.addEventListener('click', () => {
    $('#adminSidebar')?.classList.toggle('open');
  });
  $('#sidebarClose')?.addEventListener('click', () => {
    $('#adminSidebar')?.classList.remove('open');
  });
}

// ---- DASHBOARD ----
function renderDashboard() {
  const products = getProducts();
  const totalEl = $('#totalProducts');
  if (totalEl) totalEl.textContent = products.length;

  const list = $('#recentProductsList');
  if (!list) return;

  if (!products.length) {
    list.innerHTML = `<p class="empty-msg">No products yet. <a href="#" data-section="add-product" class="nav-to">Add one →</a></p>`;
    list.querySelectorAll('.nav-to').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        document.querySelector('.sidebar-link[data-section="add-product"]')?.click();
      });
    });
    return;
  }

  const recent = products.slice(-5).reverse();
  list.innerHTML = recent.map(p => `
    <div class="recent-item">
      <img src="${p.image || ''}" alt="${p.name}" class="recent-img" onerror="this.style.background='#ddd';this.src='';" />
      <div class="recent-info">
        <div class="recent-name">${p.name}</div>
        <div class="recent-cat">${p.category}</div>
      </div>
      <div class="recent-price">$${parseFloat(p.price).toFixed(2)}</div>
    </div>
  `).join('');
}

// ---- PRODUCTS TABLE ----
function renderTable() {
  const tbody = $('#productsTableBody');
  if (!tbody) return;
  const products = getProducts();

  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-msg">No products yet. Add your first product!</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map((p, i) => `
    <tr>
      <td>
        <img src="${p.image || ''}" alt="${p.name}" class="table-img"
          onerror="this.style.background='linear-gradient(135deg,#667eea,#764ba2)';this.src='';" />
      </td>
      <td><strong>${p.name}</strong>${p.desc ? `<br><small style="color:#888;">${p.desc}</small>` : ''}</td>
      <td style="text-transform:capitalize;">${p.category}</td>
      <td>
        <strong>$${parseFloat(p.price).toFixed(2)}</strong>
        ${p.original ? `<br><small style="text-decoration:line-through;color:#aaa;">$${parseFloat(p.original).toFixed(2)}</small>` : ''}
      </td>
      <td>${p.badge ? `<span class="badge-pill badge-${p.badge.toLowerCase()}">${p.badge}</span>` : '—'}</td>
      <td>
        <div class="action-btns">
          <button class="btn-edit" data-index="${i}">✏️ Edit</button>
          <button class="btn-delete" data-index="${i}">🗑️ Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  // Edit buttons
  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', function () { startEdit(+this.dataset.index); });
  });

  // Delete buttons
  tbody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', function () { openDeleteModal(+this.dataset.index); });
  });
}

// ---- ADD / EDIT PRODUCT FORM ----
let currentImageBase64 = '';

function initForm() {
  const form = $('#productForm');
  const imgInput = $('#pImage');
  const imgPreview = $('#imgPreview');
  const imgPlaceholder = $('#imgPlaceholder');
  const uploadArea = $('#imgUploadArea');
  const cancelBtn = $('#cancelEdit');

  // Image preview
  if (imgInput) {
    imgInput.addEventListener('change', function () {
      const file = this.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        showImgError('Image must be under 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        currentImageBase64 = e.target.result;
        imgPreview.src = currentImageBase64;
        imgPreview.classList.add('visible');
        imgPlaceholder.style.display = 'none';
        clearImgError();
      };
      reader.readAsDataURL(file);
    });
  }

  // Drag & drop
  if (uploadArea) {
    uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
    uploadArea.addEventListener('drop', e => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        const dt = new DataTransfer();
        dt.items.add(file);
        imgInput.files = dt.files;
        imgInput.dispatchEvent(new Event('change'));
      }
    });
  }

  // Cancel edit
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => { resetForm(); });
  }

  // Submit
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateForm()) return;

      const products = getProducts();
      const editIdx = $('#editIndex').value;

      const product = {
        id: editIdx !== '' ? products[+editIdx].id : generateId(),
        name: $('#pName').value.trim(),
        category: $('#pCategory').value,
        price: $('#pPrice').value,
        original: $('#pOriginal').value || '',
        badge: $('#pBadge').value,
        desc: $('#pDesc').value.trim(),
        image: currentImageBase64 || (editIdx !== '' ? products[+editIdx].image : ''),
      };

      if (editIdx !== '') {
        products[+editIdx] = product;
        showAdminToast('Product updated successfully ✅');
      } else {
        products.push(product);
        showAdminToast('Product added successfully 🎉');
      }

      saveProducts(products);
      resetForm();
      renderDashboard();
    });
  }
}

function validateForm() {
  let valid = true;

  function check(id, msg) {
    const el = $(`#${id}`);
    const g = el?.closest('.form-group');
    if (!el || !g) return;
    if (!el.value.trim()) {
      g.classList.add('has-error');
      const err = g.querySelector('.error-msg');
      if (err) err.textContent = msg;
      valid = false;
    } else {
      g.classList.remove('has-error');
    }
  }

  check('pName', 'Product name is required.');
  check('pCategory', 'Please select a category.');
  check('pPrice', 'Price is required.');

  const editIdx = $('#editIndex').value;
  const products = getProducts();
  const hasExistingImage = editIdx !== '' && products[+editIdx]?.image;

  if (!currentImageBase64 && !hasExistingImage) {
    showImgError('Please upload a product image.');
    valid = false;
  }

  return valid;
}

function startEdit(index) {
  const products = getProducts();
  const p = products[index];
  if (!p) return;

  $('#editIndex').value = index;
  $('#pName').value = p.name;
  $('#pCategory').value = p.category;
  $('#pPrice').value = p.price;
  $('#pOriginal').value = p.original || '';
  $('#pBadge').value = p.badge || '';
  $('#pDesc').value = p.desc || '';

  if (p.image) {
    currentImageBase64 = p.image;
    const imgPreview = $('#imgPreview');
    imgPreview.src = p.image;
    imgPreview.classList.add('visible');
    $('#imgPlaceholder').style.display = 'none';
  }

  $('#formTitle').textContent = 'Edit Product';
  $('#submitBtn').textContent = 'Update Product';
  $('#cancelEdit').style.display = 'inline-block';

  // Navigate to form
  $$('.admin-section').forEach(s => s.classList.remove('active'));
  $('#section-add-product').classList.add('active');
  $$('.sidebar-link').forEach(l => l.classList.remove('active'));
  $('#topbarTitle').textContent = 'Edit Product';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
  $('#productForm')?.reset();
  $('#editIndex').value = '';
  $('#formTitle').textContent = 'Add New Product';
  $('#submitBtn').textContent = 'Save Product';
  $('#cancelEdit').style.display = 'none';
  currentImageBase64 = '';
  const prev = $('#imgPreview');
  if (prev) { prev.src = ''; prev.classList.remove('visible'); }
  const ph = $('#imgPlaceholder');
  if (ph) ph.style.display = '';
  $$('.form-group').forEach(g => g.classList.remove('has-error'));
  clearImgError();
}

function showImgError(msg) {
  const el = $('#imgError');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function clearImgError() {
  const el = $('#imgError');
  if (el) { el.textContent = ''; el.style.display = 'none'; }
}

// ---- DELETE MODAL ----
let deleteTargetIndex = -1;

function openDeleteModal(index) {
  deleteTargetIndex = index;
  $('#deleteModal')?.classList.add('show');
}

function initDeleteModal() {
  $('#confirmDelete')?.addEventListener('click', () => {
    if (deleteTargetIndex < 0) return;
    const products = getProducts();
    products.splice(deleteTargetIndex, 1);
    saveProducts(products);
    deleteTargetIndex = -1;
    $('#deleteModal')?.classList.remove('show');
    renderTable();
    renderDashboard();
    showAdminToast('Product deleted.');
  });

  $('#cancelDelete')?.addEventListener('click', () => {
    deleteTargetIndex = -1;
    $('#deleteModal')?.classList.remove('show');
  });

  $('#deleteModal')?.addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('show');
  });
}

// ---- TOAST ----
function showAdminToast(msg) {
  let t = document.querySelector('.admin-toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'admin-toast';
    t.style.cssText = `
      position:fixed;bottom:28px;right:28px;background:#1a1a2e;color:#fff;
      padding:14px 20px;border-radius:8px;font-size:0.88rem;font-weight:500;
      box-shadow:0 8px 24px rgba(0,0,0,0.2);transform:translateY(20px);
      opacity:0;transition:all 0.3s ease;z-index:9999;
      border-left:4px solid #e8b86d;font-family:'Poppins',sans-serif;
    `;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateY(0)'; });
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(20px)'; }, 2800);
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initForm();
  initDeleteModal();
  renderDashboard();
  renderTable();
});

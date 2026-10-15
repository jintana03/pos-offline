(function () {
  const PRODUCTS_KEY = 'pos_products_v1';
  const form = document.querySelector('#productForm');
  const productsNav = document.querySelector('.nav-item[data-view="products"]');
  const navList = document.querySelector('.nav-list');
  if (!form || !productsNav || !navList) return;

  function readProducts() {
    try { return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]'); } catch (_) { return []; }
  }

  function saveProducts() {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  }

  function isHidden(product) { return product?.hidden === true; }

  function withVisibleProducts(callback) {
    const all = products;
    products = all.filter((product) => !isHidden(product));
    try { return callback(); } finally { products = all; }
  }

  const originalRenderProducts = window.renderProducts;
  const originalRenderCategories = window.renderCategories;
  if (originalRenderProducts) window.renderProducts = () => withVisibleProducts(originalRenderProducts);
  if (originalRenderCategories) window.renderCategories = () => withVisibleProducts(originalRenderCategories);

  const hiddenField = document.createElement('label');
  hiddenField.className = 'hidden-product-field';
  hiddenField.innerHTML = '<input id="productHiddenInput" name="hidden" type="checkbox" /><span class="hidden-product-label">ซ่อนจากหน้าคิดเงิน</span><small>เก็บไว้ในหน้าสินค้าที่ซ่อนไว้ และยังไม่นำขึ้นขาย</small>';
  form.querySelector('.modal-actions')?.before(hiddenField);
  const hiddenInput = hiddenField.querySelector('input');

  function fillHiddenField() {
    const id = form.elements.id?.value;
    const product = readProducts().find((item) => item.id === id);
    if (hiddenInput) hiddenInput.checked = isHidden(product);
  }

  const originalSubmit = form.onsubmit;
  form.onsubmit = function (event) {
    const idBefore = form.elements.id.value;
    const nameBefore = form.elements.name.value.trim();
    const skuBefore = form.elements.sku.value.trim();
    const hidden = Boolean(hiddenInput?.checked);
    const result = originalSubmit ? originalSubmit.call(this, event) : undefined;
    setTimeout(() => {
      const stored = readProducts();
      const product = idBefore
        ? stored.find((item) => item.id === idBefore)
        : stored.find((item) => item.name === nameBefore && item.sku === (skuBefore || item.sku)) || stored[0];
      if (!product) return;
      product.hidden = hidden;
      products = stored;
      saveProducts();
      renderCategories();
      renderProducts();
      renderManageProducts();
      renderHiddenProducts();
    }, 0);
    return result;
  };

  const hiddenNav = document.createElement('button');
  hiddenNav.type = 'button';
  hiddenNav.className = 'nav-item hidden-products-nav';
  hiddenNav.dataset.view = 'hidden-products';
  hiddenNav.innerHTML = '<span>▧</span> สินค้าที่ซ่อนไว้';
  productsNav.after(hiddenNav);

  const hiddenView = document.createElement('section');
  hiddenView.id = 'hidden-productsView';
  hiddenView.className = 'view hidden-products-view';
  hiddenView.innerHTML = `
    <div class="page-heading">
      <div><p class="eyebrow">คลังสินค้า / ซ่อนชั่วคราว</p><h1>สินค้าที่ซ่อนไว้</h1></div>
      <span class="date-chip" id="hiddenProductCount">0 รายการ</span>
    </div>
    <div class="panel table-panel">
      <div class="panel-header">
        <div><h2>รายการสินค้าที่ซ่อนไว้</h2><p>สินค้าในหน้านี้จะไม่แสดงในหน้าคิดเงินจนกว่าจะกดนำกลับมาแสดง</p></div>
        <label class="search-box compact"><span>⌕</span><input id="hiddenProductSearch" type="search" placeholder="ค้นหาชื่อสินค้า หรือ SKU" /></label>
      </div>
      <div class="table-wrap"><table><thead><tr><th>สินค้า</th><th>SKU</th><th>หมวดหมู่</th><th>ราคาขาย</th><th>จัดการ</th></tr></thead><tbody id="hiddenProductsTable"></tbody></table></div>
    </div>`;
  document.querySelector('#productsView')?.after(hiddenView);

  const hiddenSearch = hiddenView.querySelector('#hiddenProductSearch');
  const hiddenTable = hiddenView.querySelector('#hiddenProductsTable');
  const hiddenCount = hiddenView.querySelector('#hiddenProductCount');

  function renderHiddenProducts() {
    if (!hiddenTable) return;
    const query = String(hiddenSearch?.value || '').trim().toLowerCase();
    const hiddenProducts = products.filter(isHidden).filter((product) => !query || `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(query));
    hiddenCount.textContent = `${products.filter(isHidden).length} รายการ`;
    hiddenTable.innerHTML = hiddenProducts.length ? hiddenProducts.map((product) => `<tr>
      <td>${product.icon || '📦'} &nbsp;${product.name}</td><td>${product.sku || '—'}</td><td>${product.category || 'อื่น ๆ'}</td><td>${money(product.price)}</td>
      <td><div class="hidden-product-actions"><button class="small-button" data-unhide="${product.id}">นำกลับมาแสดง</button><button class="small-button" data-edit-hidden="${product.id}">แก้ไข</button></div></td>
    </tr>`).join('') : '<tr><td colspan="5" class="empty-table">ยังไม่มีสินค้าที่ซ่อนไว้</td></tr>';
    hiddenTable.querySelectorAll('[data-unhide]').forEach((button) => button.addEventListener('click', () => {
      const product = products.find((item) => item.id === button.dataset.unhide);
      if (!product) return;
      product.hidden = false;
      saveProducts();
      renderCategories();
      renderProducts();
      renderManageProducts();
      renderHiddenProducts();
    }));
    hiddenTable.querySelectorAll('[data-edit-hidden]').forEach((button) => button.addEventListener('click', () => {
      openProduct(button.dataset.editHidden);
      setTimeout(fillHiddenField, 0);
    }));
  }

  function openHiddenView() {
    document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item === hiddenNav));
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active-view', view === hiddenView));
    renderHiddenProducts();
  }

  hiddenNav.addEventListener('click', openHiddenView);
  hiddenSearch?.addEventListener('input', renderHiddenProducts);
  document.addEventListener('click', (event) => {
    if (event.target.closest('#addProductBtn, [data-edit]')) setTimeout(fillHiddenField, 0);
  }, true);

  window.renderHiddenProducts = renderHiddenProducts;
  renderCategories();
  renderProducts();
  renderHiddenProducts();
})();

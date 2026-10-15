(function () {
  function normaliseStoredProducts() {
    try {
      const stored = JSON.parse(localStorage.getItem('pos_products_v1') || 'null');
      if (!Array.isArray(stored)) return;
      stored.forEach((product) => {
        product.name = String(product.name || 'สินค้าไม่ระบุชื่อ').trim();
        product.sku = String(product.sku || '').trim();
        product.category = String(product.category || '').trim() || 'อื่น ๆ';
        product.unit = String(product.unit || '').trim() || 'ชิ้น';
        product.price = Number(product.price || 0);
        product.stock = Number(product.stock || 0);
      });
      localStorage.setItem('pos_products_v1', JSON.stringify(stored));
    } catch (_) {}
  }

  normaliseStoredProducts();

  function getProducts() {
    try {
      return JSON.parse(localStorage.getItem('pos_products_v1') || 'null') || window.POS_IMPORTED_PRODUCTS || [];
    } catch (_) {
      return window.POS_IMPORTED_PRODUCTS || [];
    }
  }

  function categories() {
    const values = [...new Set(getProducts().map((product) => String(product.category || '').trim()).filter(Boolean))];
    if (!values.includes('อื่น ๆ')) values.push('อื่น ๆ');
    return values;
  }

  function syncCategoryEditor() {
    const select = document.querySelector('#productCategorySelect');
    if (!select) return;
    const input = document.createElement('input');
    input.name = 'category';
    input.id = 'productCategoryInput';
    input.setAttribute('list', 'categoryList');
    input.required = true;
    input.placeholder = 'เลือกหรือพิมพ์หมวดหมู่ใหม่';
    const list = document.createElement('datalist');
    list.id = 'categoryList';
    list.innerHTML = categories().map((category) => `<option value="${category.replaceAll('"', '&quot;')}"></option>`).join('');
    select.replaceWith(input);
    input.parentElement.appendChild(list);
  }

  function addSearchButton(inputId, renderName) {
    const input = document.querySelector(`#${inputId}`);
    if (!input || input.dataset.searchReady) return;
    input.dataset.searchReady = 'true';
    const run = () => input.dispatchEvent(new Event('input', { bubbles: true }));
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-trigger';
    button.textContent = 'ค้นหา';
    button.addEventListener('click', run);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        run();
      }
    });
    input.parentElement.appendChild(button);
  }

  window.syncCategorySelect = syncCategoryEditor;
  setTimeout(() => {
    syncCategoryEditor();
    addSearchButton('productSearch', 'renderProducts');
    addSearchButton('manageSearch', 'renderManageProducts');
  }, 0);
})();

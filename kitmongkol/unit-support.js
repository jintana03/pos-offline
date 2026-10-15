(function () {
  const form = document.querySelector('#productForm');
  if (!form) return;

  const unitLabel = document.createElement('label');
  unitLabel.innerHTML = 'หน่วยสินค้า *<input name="unit" id="productUnitInput" list="unitList" required placeholder="เลือกหรือพิมพ์หน่วยสินค้า" />';
  const unitList = document.createElement('datalist');
  unitList.id = 'unitList';
  ['ชิ้น', 'อัน', 'เมตร', 'ม้วน', 'ถุง', 'ขีด', 'ลูก', 'ขด', 'กล่อง'].forEach((unit) => {
    const option = document.createElement('option');
    option.value = unit;
    unitList.appendChild(option);
  });
  unitLabel.appendChild(unitList);
  form.insertBefore(unitLabel, form.querySelector('.form-row'));

  const unitInput = form.elements.unit;
  unitInput.value = 'ชิ้น';
  unitInput.defaultValue = 'ชิ้น';

  function storedProducts() {
    try { return JSON.parse(localStorage.getItem('pos_products_v1') || '[]'); } catch (_) { return []; }
  }

  function fillUnitForOpenForm() {
    const id = form.elements.id?.value;
    const product = storedProducts().find((item) => item.id === id);
    unitInput.value = product?.unit || 'ชิ้น';
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('#addProductBtn, [data-edit]')) {
      setTimeout(fillUnitForOpenForm, 0);
    }
  }, true);

  const originalSubmit = form.onsubmit;
  form.onsubmit = function (event) {
    const idBeforeSave = form.elements.id.value;
    const nameBeforeSave = form.elements.name.value;
    const skuBeforeSave = form.elements.sku.value;
    const unit = form.elements.unit.value.trim() || 'ชิ้น';
    const existingIds = new Set(storedProducts().map((item) => item.id));
    const result = originalSubmit ? originalSubmit.call(this, event) : undefined;
    setTimeout(() => {
      const products = storedProducts();
      const product = idBeforeSave
        ? products.find((item) => item.id === idBeforeSave)
        : products.find((item) => !existingIds.has(item.id))
          || products.find((item) => item.name === nameBeforeSave && item.sku === (skuBeforeSave || item.sku))
          || products[0];
      if (product) {
        product.unit = unit;
        localStorage.setItem('pos_products_v1', JSON.stringify(products));
        if (typeof renderProducts === 'function') renderProducts();
        if (typeof renderManageProducts === 'function') renderManageProducts();
      }
    }, 0);
    return result;
  };
})();

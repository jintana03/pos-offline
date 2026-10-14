(function () {
  const form = document.querySelector('#productForm');
  if (!form) return;

  function nextSku() {
    const products = (() => {
      try { return JSON.parse(localStorage.getItem('pos_products_v1') || '[]'); } catch (_) { return []; }
    })();
    const used = new Set(products.map(product => String(product.sku || '').trim().toUpperCase()));
    const numbers = products
      .map(product => String(product.sku || '').match(/^SKU-(\d+)$/i))
      .filter(Boolean)
      .map(match => Number(match[1]));
    let number = Math.max(0, ...numbers) + 1;
    let sku = `SKU-${String(number).padStart(4, '0')}`;
    while (used.has(sku)) {
      number += 1;
      sku = `SKU-${String(number).padStart(4, '0')}`;
    }
    return sku;
  }

  function fillNewSku() {
    const id = form.elements.id?.value;
    const sku = form.elements.sku;
    if (!id && sku && !sku.value.trim()) sku.value = nextSku();
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('#addProductBtn')) window.setTimeout(fillNewSku, 0);
  }, true);
})();

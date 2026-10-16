(function () {
  const form = document.querySelector('#productForm');
  if (!form) return;

  function nextSku() {
    const sequenceKey = 'pos_sku_sequence_v1';
    const products = (() => {
      try { return JSON.parse(localStorage.getItem('pos_products_v1') || '[]'); } catch (_) { return []; }
    })();
    const values = products.map(product => String(product.sku || '').trim());
    const used = new Set(values.map(value => value.toUpperCase()));
    const numericValues = values.filter(value => /^\d+$/.test(value));
    if (numericValues.length) {
      const latest = numericValues.reduce((current, value) => value.length > current.length || (value.length === current.length && value > current) ? value : current, numericValues[0]);
      let number = BigInt(latest);
      try {
        const remembered = BigInt(localStorage.getItem(sequenceKey) || '0');
        if (remembered > number) number = remembered;
      } catch (_) {}
      number += 1n;
      let sku = String(number).padStart(latest.length, '0');
      while (used.has(sku.toUpperCase())) {
        number += 1n;
        sku = String(number).padStart(latest.length, '0');
      }
      localStorage.setItem(sequenceKey, String(number));
      return sku;
    }
    const generatedNumbers = values
      .map(value => value.match(/^SKU-(\d+)$/i))
      .filter(Boolean)
      .map(match => Number(match[1]));
    let number = Math.max(0, ...generatedNumbers) + 1;
    try {
      const remembered = Number(localStorage.getItem(sequenceKey) || '0');
      if (Number.isFinite(remembered)) number = Math.max(number, remembered + 1);
    } catch (_) {}
    let sku = `SKU-${String(number).padStart(4, '0')}`;
    while (used.has(sku)) {
      number += 1;
      sku = `SKU-${String(number).padStart(4, '0')}`;
    }
    localStorage.setItem(sequenceKey, String(number));
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

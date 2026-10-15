(function () {
  if (window.POS_SHOP_ID !== 'kitpaisan') return;

  document.documentElement.classList.add('shop-no-stock-check');

  function hideStockInput() {
    const input = document.querySelector('#productForm input[name="stock"]');
    if (!input) return;
    input.required = false;
    input.value = '9999';
    input.closest('label')?.setAttribute('hidden', 'hidden');
  }

  function allowProductButtons() {
    document.querySelectorAll('#productGrid [data-product]').forEach((button) => {
      button.disabled = false;
      button.classList.remove('out');
    });
  }

  function unlimitedAddToCart(id) {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    const item = cart.find((entry) => entry.id === id);
    if (item) item.qty += 1;
    else cart.push({ id, qty: 1 });
    renderCart();
  }

  function unlimitedChangeQty(id, delta) {
    const item = cart.find((entry) => entry.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty < 1) cart = cart.filter((entry) => entry.id !== id);
    renderCart();
  }

  function keepStockUnchangedAfterSale() {
    const button = document.querySelector('#confirmPaymentBtn');
    if (!button || button.dataset.noStockWrapped || typeof button.onclick !== 'function') return;
    const originalClick = button.onclick;
    button.dataset.noStockWrapped = 'true';
    button.onclick = function (event) {
      const snapshot = products.map((product) => ({ id: product.id, stock: product.stock }));
      const result = originalClick.call(this, event);
      snapshot.forEach((saved) => {
        const product = products.find((item) => item.id === saved.id);
        if (product) product.stock = saved.stock;
      });
      localStorage.setItem('pos_products_v1', JSON.stringify(products));
      renderProducts();
      renderManageProducts();
      return result;
    };
  }

  window.addToCart = unlimitedAddToCart;
  window.changeQty = unlimitedChangeQty;
  hideStockInput();
  allowProductButtons();
  keepStockUnchangedAfterSale();

  document.querySelector('#productForm')?.addEventListener('submit', () => {
    const input = document.querySelector('#productForm input[name="stock"]');
    if (input) input.value = '9999';
  }, true);

  const grid = document.querySelector('#productGrid');
  if (grid) new MutationObserver(allowProductButtons).observe(grid, { childList: true });
  document.addEventListener('click', () => window.setTimeout(hideStockInput, 0), true);
})();

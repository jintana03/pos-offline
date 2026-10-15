(function () {
  if (window.POS_SHOP_ID !== 'kitpaisan') return;

  document.documentElement.classList.add('shop-no-stock-check');

  const SALES_KEY = 'pos_sales_v1';
  const RESET_PENDING_KEY = 'pos_kitpaisan_sales_reset_pending_v1';
  const RESET_DONE_KEY = 'pos_kitpaisan_sales_reset_done_v1';

  function resetLocalSalesOnce() {
    if (localStorage.getItem(RESET_DONE_KEY) === '1') return;
    sales = [];
    localStorage.setItem(SALES_KEY, '[]');
    localStorage.setItem(RESET_PENDING_KEY, '1');
    renderReports();
  }

  async function resetCloudSales() {
    if (localStorage.getItem(RESET_PENDING_KEY) !== '1') return true;
    if (!window.posSupabase?.hasSession?.()) return false;
    try {
      await window.posSupabase.query('/rest/v1/sales?shop_key=eq.kitpaisan', {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' }
      });
      localStorage.removeItem(RESET_PENDING_KEY);
      localStorage.setItem(RESET_DONE_KEY, '1');
      return true;
    } catch (error) {
      console.warn('Kitpaisan sales reset failed:', error.message);
      return false;
    }
  }

  function hideStockElements() {
    document.querySelectorAll('#productGrid .stock, #reportStock, #reportStock + small').forEach((element) => {
      element.style.setProperty('display', 'none', 'important');
      element.setAttribute('aria-hidden', 'true');
    });

    document.querySelector('#reportStock')?.closest('.stat-card')?.style.setProperty('display', 'none', 'important');

    const table = document.querySelector('#productsView .table-panel table');
    const header = table?.querySelector('thead tr');
    const stockHeader = [...(header?.children || [])].findIndex((cell) => cell.textContent.trim() === 'คงเหลือ');
    if (table && stockHeader >= 0) {
      table.querySelectorAll(`tr > :nth-child(${stockHeader + 1})`).forEach((cell) => {
        cell.style.setProperty('display', 'none', 'important');
        cell.setAttribute('aria-hidden', 'true');
      });
    }
  }

  resetLocalSalesOnce();

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

  const cloudStart = window.posCloudSync?.start;
  if (cloudStart) {
    window.posCloudSync.start = async function () {
      await resetCloudSales();
      return cloudStart.apply(this, arguments);
    };
  }

  window.addToCart = unlimitedAddToCart;
  window.changeQty = unlimitedChangeQty;
  hideStockInput();
  hideStockElements();
  allowProductButtons();
  keepStockUnchangedAfterSale();

  document.querySelector('#productForm')?.addEventListener('submit', () => {
    const input = document.querySelector('#productForm input[name="stock"]');
    if (input) input.value = '9999';
  }, true);

  const grid = document.querySelector('#productGrid');
  if (grid) new MutationObserver(allowProductButtons).observe(grid, { childList: true });
  document.addEventListener('click', () => window.setTimeout(() => {
    hideStockInput();
    hideStockElements();
  }, 0), true);

  const productsView = document.querySelector('#productsView');
  if (productsView) new MutationObserver(hideStockElements).observe(productsView, { childList: true, subtree: true });
  const reportsView = document.querySelector('#reportsView');
  if (reportsView) new MutationObserver(hideStockElements).observe(reportsView, { childList: true, subtree: true });
})();

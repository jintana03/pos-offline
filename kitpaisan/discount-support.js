(function () {
  const summary = document.querySelector('.cart-summary');
  if (!summary) return;

  const discountRow = document.createElement('div');
  discountRow.className = 'discount-editor';
  discountRow.innerHTML = '<label for="discountInput">ส่วนลดท้ายบิล (%)</label><div><input id="discountInput" type="number" min="0" max="100" step="0.01" placeholder="0.00" inputmode="decimal" /><small id="discountAmountHint">คิดเป็น ฿0.00</small></div>';
  summary.insertBefore(discountRow, summary.querySelector('.summary-total'));

  const discountInput = discountRow.querySelector('#discountInput');
  const subtotalText = document.querySelector('#subtotalText');
  const discountText = document.querySelector('#discountText');
  const totalText = document.querySelector('#totalText');
  const checkoutButton = document.querySelector('#checkoutBtn');
  const paymentTotal = document.querySelector('#paymentTotal');
  const paymentDiscountInput = document.querySelector('#paymentDiscountInput');
  const paymentDiscountAmount = document.querySelector('#paymentDiscountAmount');
  const discountAmountHint = document.querySelector('#discountAmountHint');

  function currentSubtotal() {
    return typeof cart !== 'undefined'
      ? cart.reduce((sum, item) => {
        const product = products.find((entry) => entry.id === item.id);
        return sum + (product ? Number(product.price || 0) * item.qty : 0);
      }, 0)
      : 0;
  }

  function currentDiscountPercent() {
    return Math.min(Math.max(Number(discountInput.value) || 0, 0), 100);
  }

  function currentDiscount(subtotal = currentSubtotal()) {
    return subtotal * currentDiscountPercent() / 100;
  }

  function updateSummary() {
    const subtotal = currentSubtotal();
    const discount = currentDiscount(subtotal);
    const total = Math.max(0, subtotal - discount);
    const discountPercent = currentDiscountPercent();
    discountInput.value = discountPercent ? discountPercent : '';
    discountAmountHint.textContent = `คิดเป็น ${money(discount)}`;
    subtotalText.textContent = money(subtotal);
    discountText.textContent = money(discount);
    totalText.textContent = money(total);
    checkoutButton.disabled = !cart.length;
  }

  discountInput.addEventListener('input', updateSummary);
  new MutationObserver(updateSummary).observe(document.querySelector('#cartItems'), { childList: true, subtree: true });
  updateSummary();

  checkoutButton.onclick = function () {
    if (!cart.length) return;
    openPayment();
    const subtotal = currentSubtotal();
    const discountPercent = currentDiscountPercent();
    const discount = currentDiscount(subtotal);
    const total = Math.max(0, subtotal - discount);
    paymentTotal.textContent = money(total);
    paymentDiscountInput.value = discountPercent || '';
    paymentDiscountAmount.textContent = money(discount);
    updateChange();
  };

  paymentDiscountInput.addEventListener('input', () => {
    discountInput.value = paymentDiscountInput.value;
    updateSummary();
    const subtotal = currentSubtotal();
    const discount = currentDiscount(subtotal);
    paymentDiscountAmount.textContent = money(discount);
    paymentTotal.textContent = money(Math.max(0, subtotal - discount));
    updateChange();
  });

  document.querySelector('#confirmPaymentBtn').onclick = function () {
    const subtotal = currentSubtotal();
    const discountPercent = currentDiscountPercent();
    const discount = currentDiscount(subtotal);
    const total = Math.max(0, subtotal - discount);
    const number = `INV-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(sales.length + 1).padStart(3, '0')}`;
    const items = cart.map((item) => ({ ...products.find((product) => product.id === item.id), qty: item.qty }));
    const sale = {
      number,
      date: new Date().toISOString(),
      items,
      subtotal,
      discountPercent,
      discount,
      total,
      payment: selectedPayment,
      cash: selectedPayment === 'เงินสด' ? Number(document.querySelector('#cashReceived').value) : total,
      change: selectedPayment === 'เงินสด' ? Math.max(0, Number(document.querySelector('#cashReceived').value) - total) : 0
    };

    items.forEach((item) => {
      const product = products.find((entry) => entry.id === item.id);
      product.stock = Math.max(0, product.stock - item.qty);
    });
    sales.unshift(sale);
    save(STORAGE.products, products);
    save(STORAGE.sales, sales);
    cart = [];
    discountInput.value = '';
    closeModal('paymentModal');
    renderProducts();
    renderCategories();
    renderCart();
    renderReports();
    renderReceipt(sale);
    openModal('receiptModal');
  };
})();

(function () {
  const STYLE_ID = 'receipt-history-support-style';
  const MODAL_ID = 'saleEditModal';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function saleListForToday() {
    const today = new Date().toDateString();
    return sales.filter((sale) => new Date(sale.date).toDateString() === today).slice(0, 20);
  }

  function findSale(number) {
    return sales.find((sale) => String(sale.number) === String(number));
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .sale-actions { display:flex; flex-wrap:wrap; gap:5px; min-width:190px; }
      .sale-actions .small-button { padding:6px 8px; font-size:11px; }
      .sale-edit-items { display:grid; gap:9px; margin:8px 0 16px; }
      .sale-edit-item { display:grid; grid-template-columns:minmax(0,1fr) 82px 100px; gap:7px; align-items:end; }
      .sale-edit-item label { margin:0; }
      .sale-edit-item small { display:block; color:#8a95a8; font-size:10px; margin-top:4px; }
      @media (max-width:620px) { .sale-edit-item { grid-template-columns:1fr 1fr; } .sale-edit-item label:first-child { grid-column:1/-1; } }
    `;
    document.head.appendChild(style);
  }

  function injectModal() {
    if (document.getElementById(MODAL_ID)) return;
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = MODAL_ID;
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-heading">
          <div><p class="eyebrow">แก้ไขประวัติการขาย</p><h2>แก้ไขใบเสร็จ</h2></div>
          <button class="close-button" type="button" data-close-sale-edit>&times;</button>
        </div>
        <form id="saleEditForm">
          <label>เลขที่ใบเสร็จ<input id="saleEditNumber" type="text" readonly /></label>
          <label>วันที่และเวลา<input id="saleEditDate" type="datetime-local" required /></label>
          <label>การชำระเงิน<select id="saleEditPayment"><option>เงินสด</option><option>โอนเงิน</option><option>บัตร</option></select></label>
          <div><p class="eyebrow">รายการสินค้า</p><div id="saleEditItems" class="sale-edit-items"></div></div>
          <label id="saleEditCashLabel">รับเงิน<input id="saleEditCash" type="number" min="0" step="0.01" /></label>
          <div class="modal-actions">
            <button class="outline-button" type="button" data-close-sale-edit>ยกเลิก</button>
            <button class="primary-button" type="submit">บันทึกการแก้ไข</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(backdrop);
    backdrop.querySelectorAll('[data-close-sale-edit]').forEach((button) => {
      button.addEventListener('click', () => backdrop.classList.remove('open'));
    });
    backdrop.querySelector('#saleEditPayment').addEventListener('change', updateCashVisibility);
    backdrop.querySelector('#saleEditForm').addEventListener('submit', saveEditedSale);
  }

  function formatDateInput(value) {
    const date = new Date(value || Date.now());
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  function renderEditItems(sale) {
    const host = document.getElementById('saleEditItems');
    host.innerHTML = (sale.items || []).map((item, index) => `
      <div class="sale-edit-item" data-sale-item-index="${index}">
        <label>สินค้า<input name="name" type="text" value="${escapeHtml(item.name)}" /></label>
        <label>จำนวน<input name="qty" type="number" min="0" step="1" value="${Number(item.qty || 0)}" /></label>
        <label>ราคา/หน่วย<input name="price" type="number" min="0" step="0.01" value="${Number(item.price || 0)}" /></label>
        <small>SKU: ${escapeHtml(item.sku || '-')}</small>
      </div>`).join('') || '<small>ไม่มีรายการสินค้า</small>';
  }

  function updateCashVisibility() {
    const payment = document.getElementById('saleEditPayment').value;
    document.getElementById('saleEditCashLabel').style.display = payment === 'เงินสด' ? '' : 'none';
  }

  function openReceipt(sale, print) {
    renderReceipt(sale);
    openModal('receiptModal');
    if (print) window.setTimeout(() => window.print(), 80);
  }

  function openEditSale(sale) {
    injectModal();
    document.getElementById('saleEditNumber').value = sale.number || '';
    document.getElementById('saleEditDate').value = formatDateInput(sale.date);
    document.getElementById('saleEditPayment').value = sale.payment || 'เงินสด';
    document.getElementById('saleEditCash').value = Number(sale.cash || sale.total || 0);
    renderEditItems(sale);
    updateCashVisibility();
    document.getElementById(MODAL_ID).classList.add('open');
  }

  function saveEditedSale(event) {
    event.preventDefault();
    const number = document.getElementById('saleEditNumber').value;
    const sale = findSale(number);
    if (!sale) return;
    const originalItems = sale.items || [];
    const items = [...document.querySelectorAll('#saleEditItems .sale-edit-item')].map((row, index) => {
      const original = originalItems[index] || {};
      return {
        ...original,
        name: row.querySelector('[name="name"]').value.trim() || original.name || 'สินค้า',
        qty: Math.max(0, Number(row.querySelector('[name="qty"]').value || 0)),
        price: Math.max(0, Number(row.querySelector('[name="price"]').value || 0))
      };
    }).filter((item) => item.qty > 0);

    const oldById = new Map();
    originalItems.forEach((item) => oldById.set(String(item.id), (oldById.get(String(item.id)) || 0) + Number(item.qty || 0)));
    const newById = new Map();
    items.forEach((item) => newById.set(String(item.id), (newById.get(String(item.id)) || 0) + Number(item.qty || 0)));
    products.forEach((product) => {
      const id = String(product.id);
      const oldQty = oldById.get(id) || 0;
      const newQty = newById.get(id) || 0;
      if (oldQty !== newQty) product.stock = Math.max(0, Number(product.stock || 0) + oldQty - newQty);
    });

    const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
    const discountPercent = Number(sale.discountPercent || 0);
    const discount = discountPercent ? subtotal * discountPercent / 100 : 0;
    const total = Math.max(0, subtotal - discount);
    const payment = document.getElementById('saleEditPayment').value;
    const cash = payment === 'เงินสด' ? Number(document.getElementById('saleEditCash').value || 0) : total;
    Object.assign(sale, {
      date: new Date(document.getElementById('saleEditDate').value).toISOString(),
      items, subtotal, discount, discountPercent, total, payment,
      cash: payment === 'เงินสด' ? cash : total,
      change: payment === 'เงินสด' ? Math.max(0, cash - total) : 0
    });

    localStorage.setItem('pos_products_v1', JSON.stringify(products));
    localStorage.setItem('pos_sales_v1', JSON.stringify(sales));
    document.getElementById(MODAL_ID).classList.remove('open');
    renderProducts();
    renderManageProducts();
    renderReports();
    openReceipt(sale, false);
  }

  function addActions() {
    const table = document.querySelector('#salesTable');
    if (!table) return;
    const header = table.closest('table')?.querySelector('thead tr');
    if (header && !header.querySelector('[data-sale-actions-header]')) {
      const th = document.createElement('th');
      th.textContent = 'จัดการ';
      th.dataset.saleActionsHeader = '1';
      header.appendChild(th);
    }
    const shown = saleListForToday();
    [...table.querySelectorAll('tr')].forEach((row, index) => {
      const sale = shown[index];
      if (!sale || row.querySelector('[data-sale-action]')) return;
      const cell = document.createElement('td');
      cell.innerHTML = `
        <div class="sale-actions">
          <button class="small-button" type="button" data-sale-action="view" data-sale-number="${escapeHtml(sale.number)}">ดูใบเสร็จ</button>
          <button class="small-button" type="button" data-sale-action="print" data-sale-number="${escapeHtml(sale.number)}">พิมพ์ซ้ำ</button>
          <button class="small-button" type="button" data-sale-action="edit" data-sale-number="${escapeHtml(sale.number)}">แก้ไข</button>
        </div>`;
      row.appendChild(cell);
    });
  }

  function patchReports() {
    if (typeof window.renderReports !== 'function' || window.renderReports.__receiptHistoryPatched) return;
    const original = window.renderReports;
    const enhanced = function () {
      original();
      addActions();
    };
    enhanced.__receiptHistoryPatched = true;
    window.renderReports = enhanced;
    enhanced();
  }

  injectStyle();
  injectModal();
  patchReports();
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-sale-action]');
    if (!button) return;
    const sale = findSale(button.dataset.saleNumber);
    if (!sale) return;
    if (button.dataset.saleAction === 'edit') openEditSale(sale);
    else openReceipt(sale, button.dataset.saleAction === 'print');
  });
})();

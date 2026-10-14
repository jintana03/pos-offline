(function () {
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const baht = (value) => `฿${Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  window.renderReceipt = function renderReceipt(sale) {
    let shop = {};
    try { shop = JSON.parse(localStorage.getItem('pos_settings_v1') || '{}'); } catch (_) {}
    const date = new Date(sale.date);
    const time = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateText = date.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const totalQty = sale.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const rows = sale.items.map((item, index) => `<tr>
      <td class="col-item">${index + 1}</td>
      <td class="col-code">${esc(item.sku || '—')}</td>
      <td class="col-description">${esc(item.name)}</td>
      <td class="col-qty">${item.qty}</td>
      <td class="col-unit">${esc(item.unit || 'ชิ้น')}<br><small>Unit</small></td>
      <td class="col-price">${baht(item.price)}</td>
      <td class="col-discount">-</td>
      <td class="col-amount">${baht(item.price * item.qty)}</td>
    </tr>`).join('');
    const blankRows = Math.max(0, 5 - sale.items.length);
    const blanks = Array.from({ length: blankRows }, () => '<tr class="blank-row"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>').join('');
    const address = shop.storeAddress || 'ที่อยู่ร้านค้า';
    const storePhone = shop.storePhone ? `โทร. ${esc(shop.storePhone)}` : '';

    document.querySelector('#receiptPaper').innerHTML = `<div class="invoice-paper">
      <header class="invoice-header">
        <div class="invoice-shop">
          <h3>${esc(shop.storeName || 'ร้านค้าของฉัน')}</h3>
          ${storePhone ? `<strong>${storePhone}</strong>` : ''}
          <p>${esc(address)}</p>
        </div>
        <div class="invoice-title-box">
          <h2>ใบเสร็จรับเงิน</h2>
          <strong>RECEIPT / TAX INVOICE</strong>
        </div>
        <div class="invoice-meta">
          <div><span>Date :</span><b>${dateText}</b></div>
          <div><span>Inv. No. :</span><b>${esc(sale.number)}</b></div>
          <div><span>Salesman Code :</span><b>—</b></div>
          <div><span>Time :</span><b>${time}</b></div>
          <div><span>Page :</span><b>1 / 1</b></div>
        </div>
      </header>

      <section class="invoice-customer">
        <div><span>Customer Name / ชื่อลูกค้า :</span><b>${esc(sale.customerName || 'เงินสด')}</b></div>
        <div><span>Customer No. / รหัสลูกค้า :</span><b>${esc(sale.customerNo || '999')}</b></div>
        <div><span>Reference No. / เลขที่อ้างอิง :</span><b>${esc(sale.referenceNo || '—')}</b></div>
      </section>

      <table class="invoice-items"><thead><tr>
        <th>Item<br><small>ลำดับ</small></th><th>Article Number<br><small>รหัสสินค้า</small></th><th>Article Description<br><small>รายการ</small></th><th>Qty<br><small>จำนวน</small></th><th>Unit<br><small>หน่วย</small></th><th>Price/Unit<br><small>ราคาต่อหน่วย</small></th><th>Discount<br><small>ส่วนลด</small></th><th>Amount<br><small>จำนวนเงิน</small></th>
      </tr></thead><tbody>${rows}${blanks}</tbody></table>

      <section class="invoice-bottom">
        <div class="invoice-note"><p>ได้รับสินค้าถูกต้องตามรายการข้างต้น</p><p>ใบเสร็จรับเงินจะสมบูรณ์เมื่อได้รับเงินเรียบร้อยแล้ว</p><p class="note-en">Received the goods in good order and condition.</p></div>
        <div class="invoice-totals">
          <div><span>รวมเงิน / Subtotal</span><b>${baht(sale.subtotal ?? sale.total)}</b></div>
          <div><span>ส่วนลด / Discount (${Number(sale.discountPercent || 0)}%)</span><b>${baht(sale.discount)}</b></div>
          <div class="invoice-grand"><span>ยอดสุทธิ / Net Total</span><b>${baht(sale.total)}</b></div>
        </div>
      </section>
      <div class="invoice-amount-text">จำนวนรายการ ${totalQty} ชิ้น &nbsp; | &nbsp; ชำระโดย ${esc(sale.payment)}</div>
      <footer class="invoice-signatures"><div><span>ผู้รับสินค้า</span><i></i><small>Receiver</small></div><div><span>วันที่</span><i></i><small>Date</small></div><div><span>ผู้ส่งสินค้า</span><i></i><small>Delivered by</small></div><div><span>ผู้รับเงิน / ผู้อนุมัติ</span><i></i><small>Authorized signature</small></div></footer>
    </div>`;
  };
})();

// Multi-page A4 renderer: keeps the invoice format and starts a new A4 page when needed.
(function () {
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const baht = (value) => `฿${Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const ITEMS_PER_PAGE = 15;

  function renderInvoicePage(sale, shop, items, page, totalPages, isLastPage) {
    const date = new Date(sale.date);
    const time = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateText = date.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const rows = items.map((item, index) => `<tr>
      <td class="col-item">${page === 1 ? index + 1 : (page - 1) * ITEMS_PER_PAGE + index + 1}</td>
      <td class="col-code">${esc(item.sku || '—')}</td>
      <td class="col-description">${esc(item.name)}</td>
      <td class="col-qty">${item.qty}</td>
      <td class="col-unit">${esc(item.unit || 'ชิ้น')}<br><small>Unit</small></td>
      <td class="col-price">${baht(item.price)}</td>
      <td class="col-discount">-</td>
      <td class="col-amount">${baht(item.price * item.qty)}</td>
    </tr>`).join('');
    const blankRows = isLastPage ? Math.max(0, 5 - items.length) : 0;
    const blanks = Array.from({ length: blankRows }, () => '<tr class="blank-row"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>').join('');
    const address = shop.storeAddress || 'ที่อยู่ร้านค้า';
    const storePhone = shop.storePhone ? `โทร. ${esc(shop.storePhone)}` : '';
    const totalQty = sale.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const footer = isLastPage ? `<section class="invoice-bottom">
      <div class="invoice-note"><p>ได้รับสินค้าถูกต้องตามรายการข้างต้น</p><p>ใบเสร็จรับเงินจะสมบูรณ์เมื่อได้รับเงินเรียบร้อยแล้ว</p><p class="note-en">Received the goods in good order and condition.</p></div>
      <div class="invoice-totals"><div><span>รวมเงิน / Subtotal</span><b>${baht(sale.subtotal ?? sale.total)}</b></div><div><span>ส่วนลด / Discount (${Number(sale.discountPercent || 0)}%)</span><b>${baht(sale.discount)}</b></div><div class="invoice-grand"><span>ยอดสุทธิ / Net Total</span><b>${baht(sale.total)}</b></div></div>
    </section><div class="invoice-amount-text">จำนวนรายการ ${totalQty} ชิ้น &nbsp; | &nbsp; ชำระโดย ${esc(sale.payment)}</div><footer class="invoice-signatures"><div><span>ผู้รับสินค้า</span><i></i><small>Receiver</small></div><div><span>วันที่</span><i></i><small>Date</small></div><div><span>ผู้ส่งสินค้า</span><i></i><small>Delivered by</small></div><div><span>ผู้รับเงิน / ผู้อนุมัติ</span><i></i><small>Authorized signature</small></div></footer>` : '';

    return `<div class="invoice-paper invoice-page">
      <header class="invoice-header"><div class="invoice-shop"><h3>${esc(shop.storeName || 'ร้านค้าของฉัน')}</h3>${storePhone ? `<strong>${storePhone}</strong>` : ''}<p>${esc(address)}</p></div><div class="invoice-title-box"><h2>ใบเสร็จรับเงิน</h2><strong>RECEIPT / TAX INVOICE</strong></div><div class="invoice-meta"><div><span>Date :</span><b>${dateText}</b></div><div><span>Inv. No. :</span><b>${esc(sale.number)}</b></div><div><span>Salesman Code :</span><b>—</b></div><div><span>Time :</span><b>${time}</b></div><div><span>Page :</span><b>${page} / ${totalPages}</b></div></div></header>
      <section class="invoice-customer"><div><span>Customer Name / ชื่อลูกค้า :</span><b>${esc(sale.customerName || 'เงินสด')}</b></div><div><span>Customer No. / รหัสลูกค้า :</span><b>${esc(sale.customerNo || '999')}</b></div><div><span>Reference No. / เลขที่อ้างอิง :</span><b>${esc(sale.referenceNo || '—')}</b></div></section>
      <table class="invoice-items"><colgroup><col style="width:6%"><col style="width:14%"><col style="width:28%"><col style="width:8%"><col style="width:7%"><col style="width:14%"><col style="width:10%"><col style="width:13%"></colgroup><thead><tr><th>Item<br><small>ลำดับ</small></th><th>Article Number<br><small>รหัสสินค้า</small></th><th>Article Description<br><small>รายการ</small></th><th>Qty<br><small>จำนวน</small></th><th>Unit<br><small>หน่วย</small></th><th>Price/Unit<br><small>ราคาต่อหน่วย</small></th><th>Discount<br><small>ส่วนลด</small></th><th>Amount<br><small>จำนวนเงิน</small></th></tr></thead><tbody>${rows}${blanks}</tbody></table>
      ${footer}
    </div>`;
  }

  window.renderReceipt = function renderReceipt(sale) {
    let shop = {};
    try { shop = JSON.parse(localStorage.getItem('pos_settings_v1') || '{}'); } catch (_) {}
    const pages = [];
    for (let index = 0; index < sale.items.length; index += ITEMS_PER_PAGE) pages.push(sale.items.slice(index, index + ITEMS_PER_PAGE));
    if (!pages.length) pages.push([]);
    document.querySelector('#receiptPaper').innerHTML = pages.map((items, index) => renderInvoicePage(sale, shop, items, index + 1, pages.length, index === pages.length - 1)).join('');
  };
})();

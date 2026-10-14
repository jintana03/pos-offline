(function () {
  const cloud = window.posSupabase;
  if (!cloud) return;

  const PRODUCTS_KEY = 'pos_products_v1';
  const SALES_KEY = 'pos_sales_v1';
  const SETTINGS_KEY = 'pos_settings_v1';
  const OWNER_KEY = 'pos_cloud_owner_v1';
  let started = false;
  let applying = false;
  const timers = new Map();

  function localJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch (_) { return fallback; }
  }

  function ownerId() { return cloud.userId(); }
  function cloudId(id) { return `${ownerId()}:${id}`; }
  function localId(id) { return String(id || '').startsWith(`${ownerId()}:`) ? String(id).slice(ownerId().length + 1) : id; }

  async function upsert(table, rows, conflict) {
    if (!rows.length) return;
    await cloud.query(`/rest/v1/${table}?on_conflict=${conflict}`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows)
    });
  }

  async function pushShop() {
    const settings = localJson(SETTINGS_KEY, {});
    await upsert('shops', [{ owner_id: ownerId(), name: settings.storeName || 'ร้านค้าของฉัน', updated_at: new Date().toISOString() }], 'owner_id');
  }

  async function pushProducts() {
    const rows = localJson(PRODUCTS_KEY, []).map((product) => ({
      id: cloudId(product.id), owner_id: ownerId(), name: product.name || '', sku: product.sku || null,
      category: product.category || 'อื่น ๆ', price: Number(product.price || 0),
      stock: Number(product.stock || 0), unit: product.unit || 'ชิ้น', icon: product.icon || '📦',
      deleted_at: null, updated_at: new Date().toISOString()
    }));
    await upsert('products', rows, 'id');
  }

  async function pushSales() {
    const rows = localJson(SALES_KEY, []).map((sale) => ({
      number: cloudId(sale.number), owner_id: ownerId(), sale_date: sale.date || new Date().toISOString(),
      subtotal: Number(sale.subtotal ?? sale.total ?? 0), discount: Number(sale.discount || 0),
      discount_percent: Number(sale.discountPercent || 0), total: Number(sale.total || 0),
      payment: sale.payment || 'เงินสด', data: sale, updated_at: new Date().toISOString()
    }));
    await upsert('sales', rows, 'number');
  }

  async function pushSettings() {
    const settings = localJson(SETTINGS_KEY, {});
    await upsert('shop_settings', [{ id: `shop-${ownerId()}`, owner_id: ownerId(), store_name: settings.storeName || 'ร้านค้าของฉัน', store_address: settings.storeAddress || '', store_phone: settings.storePhone || '', tax_id: settings.taxId || '', updated_at: new Date().toISOString() }], 'id');
  }

  async function pullProducts() {
    const rows = await cloud.query('/rest/v1/products?select=*&deleted_at=is.null&order=updated_at.asc');
    if (!rows?.length) { await pushProducts(); return false; }
    applying = true;
    products = rows.map((row) => ({ id: localId(row.id), name: row.name, sku: row.sku || '', category: row.category, price: Number(row.price || 0), stock: Number(row.stock || 0), unit: row.unit || 'ชิ้น', icon: row.icon || '📦' }));
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    applying = false;
    return true;
  }

  async function pullSales() {
    const rows = await cloud.query('/rest/v1/sales?select=*&order=sale_date.desc');
    if (!rows?.length) { await pushSales(); return false; }
    applying = true;
    sales = rows.map((row) => ({ ...(row.data || {}), number: localId(row.number), date: row.sale_date, subtotal: Number(row.subtotal || 0), discount: Number(row.discount || 0), discountPercent: Number(row.discount_percent || 0), total: Number(row.total || 0), payment: row.payment || 'เงินสด' }));
    localStorage.setItem(SALES_KEY, JSON.stringify(sales));
    applying = false;
    return true;
  }

  async function pullSettings() {
    const rows = await cloud.query(`/rest/v1/shop_settings?select=*&owner_id=eq.${encodeURIComponent(ownerId())}`);
    const local = localJson(SETTINGS_KEY, {});
    if (!rows?.length) { await pushSettings(); return false; }
    const row = rows[0];
    applying = true;
    settings = { storeName: row.store_name || '', storeAddress: row.store_address || '', storePhone: row.store_phone || '', taxId: row.tax_id || '' };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    applying = false;
    return true;
  }

  function switchLocalOwner() {
    const current = ownerId();
    const previous = localStorage.getItem(OWNER_KEY);
    if (previous && previous !== current) {
      applying = true;
      [PRODUCTS_KEY, SALES_KEY, SETTINGS_KEY].forEach((key) => {
        const previousValue = localStorage.getItem(key);
        if (previousValue !== null) localStorage.setItem(`${key}__owner_${previous}`, previousValue);
        const nextValue = localStorage.getItem(`${key}__owner_${current}`);
        localStorage.setItem(key, nextValue ?? (key === SETTINGS_KEY ? JSON.stringify({ storeName: 'ร้านค้าของฉัน', storeAddress: '', storePhone: '', taxId: '' }) : '[]'));
      });
      applying = false;
    }
    localStorage.setItem(OWNER_KEY, current);
  }

  async function syncNow() {
    if (!cloud.hasSession() || started || !ownerId()) return;
    started = true;
    try {
      switchLocalOwner();
      await pushShop();
      const pulled = await Promise.all([pullProducts(), pullSales(), pullSettings()]);
      if (pulled.some(Boolean)) { renderSettings(); renderCategories(); renderProducts(); renderManageProducts(); renderReports(); renderCart(); }
      document.body.dataset.cloudStatus = 'connected';
    } catch (error) {
      console.warn('Cloud sync failed:', error.message);
      document.body.dataset.cloudStatus = 'offline';
    } finally { started = false; }
  }

  function queue(key) {
    if (applying || !cloud.hasSession()) return;
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(async () => {
      try { if (key === PRODUCTS_KEY) await pushProducts(); if (key === SALES_KEY) await pushSales(); if (key === SETTINGS_KEY) { await pushShop(); await pushSettings(); } } catch (error) { console.warn('Cloud save failed:', error.message); }
    }, 450));
  }

  const nativeSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    nativeSetItem.call(this, key, value);
    if (this === localStorage && [PRODUCTS_KEY, SALES_KEY, SETTINGS_KEY].includes(key)) queue(key);
  };

  window.posCloudSync = { start: syncNow, syncNow };
  if (cloud.hasSession()) setTimeout(syncNow, 150);
})();

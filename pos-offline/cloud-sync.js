(function () {
  const cloud = window.posSupabase;
  if (!cloud) return;

  const PRODUCTS_KEY = 'pos_products_v1';
  const SALES_KEY = 'pos_sales_v1';
  const SETTINGS_KEY = 'pos_settings_v1';
  const OWNER_KEY = 'pos_cloud_owner_v1';
  const SHOP = window.POS_SHOP || { id: 'default', name: 'ร้านค้าของฉัน' };
  const SHOP_ID = String(SHOP.id || 'default');
  const SHOP_NAME = SHOP.name || 'ร้านค้าของฉัน';
  let started = false;
  let autoSyncStarted = false;
  let applying = false;
  let hiddenColumnAvailable = null;
  const timers = new Map();

  function localJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch (_) { return fallback; }
  }

  function ownerId() { return cloud.userId(); }
  function cloudId(id) { return `${SHOP_ID}:${id}`; }
  function localId(id) { return String(id || '').startsWith(`${SHOP_ID}:`) ? String(id).slice(SHOP_ID.length + 1) : id; }

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
    await upsert('shops', [{ owner_id: ownerId(), shop_key: SHOP_ID, name: settings.storeName || SHOP_NAME, updated_at: new Date().toISOString() }], 'shop_key');
  }

  async function pushProducts() {
    const rows = localJson(PRODUCTS_KEY, []).map((product) => ({
      id: cloudId(product.id), owner_id: ownerId(), shop_key: SHOP_ID, name: product.name || '', sku: product.sku || null,
      category: product.category || 'อื่น ๆ', price: Number(product.price || 0),
      stock: Number(product.stock || 0), unit: product.unit || 'ชิ้น', icon: product.icon || '📦', is_hidden: Boolean(product.hidden),
      deleted_at: null, updated_at: new Date().toISOString()
    }));
    if (hiddenColumnAvailable !== false) {
      try {
        await upsert('products', rows, 'id');
        hiddenColumnAvailable = true;
        return;
      } catch (error) {
        if (!String(error.message || '').toLowerCase().includes('is_hidden')) throw error;
        hiddenColumnAvailable = false;
      }
    }
    await upsert('products', rows.map(({ is_hidden, ...row }) => row), 'id');
  }

  async function pushSales() {
    const rows = localJson(SALES_KEY, []).map((sale) => ({
      number: cloudId(sale.number), owner_id: ownerId(), shop_key: SHOP_ID, sale_date: sale.date || new Date().toISOString(),
      subtotal: Number(sale.subtotal ?? sale.total ?? 0), discount: Number(sale.discount || 0),
      discount_percent: Number(sale.discountPercent || 0), total: Number(sale.total || 0),
      payment: sale.payment || 'เงินสด', data: sale, updated_at: new Date().toISOString()
    }));
    await upsert('sales', rows, 'number');
  }

  async function pushSettings() {
    const settings = localJson(SETTINGS_KEY, {});
    await upsert('shop_settings', [{ id: `shop-${SHOP_ID}`, owner_id: ownerId(), shop_key: SHOP_ID, store_name: settings.storeName || SHOP_NAME, store_address: settings.storeAddress || '', store_phone: settings.storePhone || '', tax_id: settings.taxId || '', updated_at: new Date().toISOString() }], 'shop_key');
  }

  async function pullProducts() {
    const rows = await cloud.query(`/rest/v1/products?select=*&shop_key=eq.${encodeURIComponent(SHOP_ID)}&deleted_at=is.null&order=updated_at.asc`);
    if (!rows?.length) { await pushProducts(); return false; }
    applying = true;
    const existingHidden = new Map(products.map((product) => [String(product.id), Boolean(product.hidden)]));
    products = rows.map((row) => ({ id: localId(row.id), name: row.name, sku: row.sku || '', category: row.category, price: Number(row.price || 0), stock: Number(row.stock || 0), unit: row.unit || 'ชิ้น', icon: row.icon || '📦', hidden: row.is_hidden === undefined ? Boolean(existingHidden.get(String(localId(row.id)))) : Boolean(row.is_hidden) }));
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    applying = false;
    return true;
  }

  async function pullSales() {
    const rows = await cloud.query(`/rest/v1/sales?select=*&shop_key=eq.${encodeURIComponent(SHOP_ID)}&order=sale_date.desc`);
    if (!rows?.length) { await pushSales(); return false; }
    applying = true;
    sales = rows.map((row) => ({ ...(row.data || {}), number: localId(row.number), date: row.sale_date, subtotal: Number(row.subtotal || 0), discount: Number(row.discount || 0), discountPercent: Number(row.discount_percent || 0), total: Number(row.total || 0), payment: row.payment || 'เงินสด' }));
    localStorage.setItem(SALES_KEY, JSON.stringify(sales));
    applying = false;
    return true;
  }

  async function pullSettings() {
    const rows = await cloud.query(`/rest/v1/shop_settings?select=*&shop_key=eq.${encodeURIComponent(SHOP_ID)}`);
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
    localStorage.setItem(OWNER_KEY, SHOP_ID);
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

  function startAutoSync() {
    if (autoSyncStarted) return;
    autoSyncStarted = true;
    const refreshWhenActive = () => {
      if (document.visibilityState === 'visible') syncNow();
    };
    window.addEventListener('focus', refreshWhenActive);
    document.addEventListener('visibilitychange', refreshWhenActive);
    window.setInterval(refreshWhenActive, 30000);
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

  window.posCloudSync = {
    start: async function () {
      startAutoSync();
      return syncNow();
    },
    syncNow
  };
})();

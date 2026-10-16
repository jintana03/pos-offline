(function () {
  if (!window.POS_COPY_CATALOG) return;

  const imported = Array.isArray(window.POS_IMPORTED_PRODUCTS) ? window.POS_IMPORTED_PRODUCTS : [];
  const version = String(window.POS_CATALOG_COPY_VERSION || 'kitpaisan-catalog-20261016-v1');
  const markerKey = 'pos_catalog_copy_v1';
  if (!imported.length || localStorage.getItem(markerKey) === version) return;

  localStorage.setItem('pos_products_v1', JSON.stringify(imported.map((product) => ({ ...product }))));
  const currentSettings = (() => {
    try { return JSON.parse(localStorage.getItem('pos_settings_v1') || 'null'); } catch (_) { return null; }
  })();
  if (!currentSettings || !currentSettings.storeName || currentSettings.storeName === 'ร้านค้าของฉัน' || currentSettings.storeName === window.POS_IMPORTED_SETTINGS?.storeName) {
    localStorage.setItem('pos_settings_v1', JSON.stringify({
      storeName: window.POS_SHOP_NAME || 'ร้านค้าของฉัน',
      storeAddress: currentSettings?.storeAddress || '',
      storePhone: currentSettings?.storePhone || '',
      taxId: currentSettings?.taxId || ''
    }));
  }
  window.POS_CATALOG_COPY_PENDING = true;
  window.POS_CATALOG_COPY_VERSION = version;
})();

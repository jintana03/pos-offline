(function () {
  const shopId = String(window.POS_SHOP_ID || 'default').trim().toLowerCase();
  const shopName = String(window.POS_SHOP_NAME || 'ร้านค้าของฉัน').trim();
  const scopedKeys = new Set([
    'pos_products_v1',
    'pos_sales_v1',
    'pos_settings_v1',
    'pos_cloud_owner_v1'
  ]);
  const prefix = `pos_shop_${shopId}_`;
  const keyFor = (key) => scopedKeys.has(key) ? `${prefix}${key}` : key;
  const nativeGetItem = Storage.prototype.getItem;
  const nativeSetItem = Storage.prototype.setItem;
  const nativeRemoveItem = Storage.prototype.removeItem;

  Storage.prototype.getItem = function (key) {
    return nativeGetItem.call(this, this === localStorage ? keyFor(key) : key);
  };
  Storage.prototype.setItem = function (key, value) {
    return nativeSetItem.call(this, this === localStorage ? keyFor(key) : key, value);
  };
  Storage.prototype.removeItem = function (key) {
    return nativeRemoveItem.call(this, this === localStorage ? keyFor(key) : key);
  };

  window.POS_SHOP_ID = shopId;
  window.POS_SHOP_NAME = shopName;
  window.POS_SHOP = { id: shopId, name: shopName };
  if (!localStorage.getItem('pos_settings_v1')) {
    localStorage.setItem('pos_settings_v1', JSON.stringify({
      storeName: shopName,
      storeAddress: '',
      storePhone: '',
      taxId: ''
    }));
  }
})();

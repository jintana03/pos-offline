(function () {
  const snapshotKey = 'pos_products_restore_snapshot_v1';
  const startedKey = '__posPersistenceGuardStarted';

  try {
    if (!window[startedKey]) {
      window[startedKey] = true;
      const existing = localStorage.getItem('pos_products_v1');
      if (existing !== null) sessionStorage.setItem(snapshotKey, existing);
      return;
    }

    const snapshot = sessionStorage.getItem(snapshotKey);
    if (snapshot !== null) {
      localStorage.setItem('pos_products_v1', snapshot);
      sessionStorage.removeItem(snapshotKey);
    }
  } catch (_) {}
})();

(function () {
  const productsTable = document.querySelector('#productsTable');
  const productGrid = document.querySelector('#productGrid');
  const cartItems = document.querySelector('#cartItems');
  if (!productsTable) return;

  function allProducts() {
    return typeof products !== 'undefined' && Array.isArray(products) ? products : [];
  }

  function unitOf(id) {
    return allProducts().find((product) => product.id === id)?.unit || 'ชิ้น';
  }

  function syncManagementTable() {
    const table = productsTable.closest('table');
    const header = table?.querySelector('thead tr');
    if (header && !header.querySelector('[data-unit-column]')) {
      const column = document.createElement('th');
      column.dataset.unitColumn = 'true';
      column.textContent = 'หน่วย';
      header.insertBefore(column, header.children[3] || null);
    }

    productsTable.querySelectorAll('tr').forEach((row) => {
      if (row.querySelector('.empty-table')) {
        const emptyCell = row.querySelector('td');
        if (emptyCell) emptyCell.colSpan = 7;
        return;
      }
      if (row.children.length >= 7) return;
      const editButton = row.querySelector('[data-edit]');
      const unitCell = document.createElement('td');
      unitCell.textContent = unitOf(editButton?.dataset.edit);
      row.insertBefore(unitCell, row.children[3] || null);
    });
  }

  function syncProductCards() {
    productGrid?.querySelectorAll('[data-product]').forEach((card) => {
      const product = allProducts().find((entry) => entry.id === card.dataset.product);
      const stock = card.querySelector('.stock');
      if (!product || !stock) return;
      const nextText = product.stock < 1 ? 'สินค้าหมด' : `เหลือ ${product.stock} ${product.unit || 'ชิ้น'}`;
      if (stock.textContent !== nextText) stock.textContent = nextText;
    });
  }

  function syncCartUnits() {
    cartItems?.querySelectorAll('.cart-item').forEach((item) => {
      const button = item.querySelector('[data-minus], [data-plus]');
      const productId = button?.dataset.minus || button?.dataset.plus;
      const product = allProducts().find((entry) => entry.id === productId);
      const priceLine = item.querySelector('.cart-item-sub');
      const nextText = product ? `${money(product.price)} / ${product.unit || 'ชิ้น'}` : '';
      if (product && priceLine && priceLine.textContent !== nextText) priceLine.textContent = nextText;
    });
  }

  syncManagementTable();
  syncProductCards();
  syncCartUnits();
  const refresh = () => {
    syncManagementTable();
    syncProductCards();
    syncCartUnits();
  };
  new MutationObserver(refresh).observe(productsTable, { childList: true, subtree: true });
  if (productGrid) new MutationObserver(refresh).observe(productGrid, { childList: true, subtree: true });
  if (cartItems) new MutationObserver(refresh).observe(cartItems, { childList: true, subtree: true });
})();

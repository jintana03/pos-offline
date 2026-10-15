(function () {
  const input = document.querySelector('#manageSearch');
  if (!input) return;

  const searchBox = input.closest('.search-box');
  const searchArea = searchBox?.parentElement;
  if (!searchBox || !searchArea) return;

  searchArea.classList.add('manage-search-area');
  const list = document.createElement('div');
  list.className = 'product-search-list';
  list.setAttribute('role', 'listbox');
  list.hidden = true;
  searchArea.appendChild(list);

  let activeIndex = -1;
  let matches = [];

  function allProducts() {
    return typeof products !== 'undefined' && Array.isArray(products) ? products : [];
  }

  function productText(product) {
    return `${product.name || ''} ${product.sku || ''} ${product.category || ''}`.toLowerCase();
  }

  function choose(product) {
    input.value = product.name || '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    list.hidden = true;
    activeIndex = -1;
  }

  function renderSuggestions() {
    const query = input.value.trim().toLowerCase();
    matches = allProducts()
      .filter((product) => !query || productText(product).includes(query))
      .slice(0, 12);
    activeIndex = -1;
    list.innerHTML = '';

    matches.forEach((product, index) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'product-search-option';
      option.setAttribute('role', 'option');
      option.dataset.index = String(index);

      const name = document.createElement('strong');
      name.textContent = product.name || 'ไม่ระบุชื่อสินค้า';
      const details = document.createElement('small');
      details.textContent = `${product.sku || 'ไม่มี SKU'} • ${product.category || 'อื่น ๆ'} • หน่วย ${product.unit || 'ชิ้น'}`;
      option.append(name, details);
      option.addEventListener('click', () => choose(product));
      list.appendChild(option);
    });

    list.hidden = !matches.length;
  }

  input.addEventListener('focus', renderSuggestions);
  input.addEventListener('input', renderSuggestions);
  input.addEventListener('keydown', (event) => {
    if (list.hidden || !matches.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = event.key === 'ArrowDown'
        ? (activeIndex + 1) % matches.length
        : (activeIndex - 1 + matches.length) % matches.length;
      [...list.children].forEach((option, index) => option.classList.toggle('active', index === activeIndex));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      choose(matches[activeIndex]);
    } else if (event.key === 'Escape') {
      list.hidden = true;
      activeIndex = -1;
    }
  });

  document.addEventListener('click', (event) => {
    if (!searchArea.contains(event.target)) list.hidden = true;
  });
})();

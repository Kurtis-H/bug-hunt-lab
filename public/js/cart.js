import { changeQty, defaultItems, isDiscountCode, money, removeItem, totals } from '/lib/cart.js';
import { bug } from './lab.js';

let items = defaultItems();
let discountApplications = 0;

const tbody = document.getElementById('items');
const message = document.getElementById('code-message');

function render() {
  tbody.textContent = '';
  for (const item of items) {
    const tr = document.createElement('tr');
    tr.dataset.testid = `item-${item.id}`;
    tr.setAttribute('data-testid', `item-${item.id}`);
    tr.innerHTML = `
      <td><span class="name"></span><br><small class="variant"></small></td>
      <td class="num price"></td>
      <td class="num"><div class="row" style="justify-content:flex-end">
        <button type="button" class="secondary dec">−</button>
        <span class="qty" data-testid="qty"></span>
        <button type="button" class="secondary inc">+</button></div></td>
      <td class="num line"></td>
      <td><button type="button" class="secondary remove">Remove</button></td>`;
    tr.querySelector('.name').textContent = item.name;
    tr.querySelector('.variant').textContent = item.variant;
    tr.querySelector('.price').textContent = money(item.priceCents);
    tr.querySelector('.qty').textContent = item.qty;
    tr.querySelector('.line').textContent = money(item.priceCents * item.qty);
    const label = `${item.name} (${item.variant})`;
    tr.querySelector('.dec').setAttribute('aria-label', `Decrease quantity of ${label}`);
    tr.querySelector('.inc').setAttribute('aria-label', `Increase quantity of ${label}`);
    tr.querySelector('.remove').setAttribute('aria-label', `Remove ${label}`);
    tr.querySelector('.dec').addEventListener('click', () => update(changeQty(items, item.id, -1, bug)));
    tr.querySelector('.inc').addEventListener('click', () => update(changeQty(items, item.id, +1, bug)));
    tr.querySelector('.remove').addEventListener('click', () => update(removeItem(items, item.id, bug)));
    tbody.appendChild(tr);
  }
  if (!items.length) tbody.innerHTML = '<tr><td colspan="5">Your cart is empty.</td></tr>';

  const t = totals(items, discountApplications, bug);
  for (const key of ['subtotal', 'discount', 'tax', 'total']) {
    const value = key === 'discount' ? -t.discount : t[key];
    document.querySelector(`[data-testid="${key}"]`).textContent = money(value);
  }
}

function update(next) {
  items = next;
  render();
}

document.getElementById('apply').addEventListener('click', () => {
  const code = document.getElementById('code').value;
  if (!isDiscountCode(code)) {
    message.textContent = 'That code is not valid.';
    return;
  }
  if (discountApplications > 0 && !bug('CART-2')) {
    message.textContent = 'Code already applied.';
    return;
  }
  discountApplications += 1;
  message.textContent = 'SAVE10 applied: 10% off.';
  render();
});

render();

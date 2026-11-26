// Cart maths. All money is handled in whole cents to avoid floating-point surprises.

export const TAX_RATE = 0.0825;
export const DISCOUNT_CODE = 'SAVE10';
export const DISCOUNT_RATE = 0.1;

export function defaultItems() {
  return [
    { id: 1, name: 'Coffee Beans', variant: '1 lb bag', priceCents: 1999, qty: 3 },
    { id: 2, name: 'T-Shirt', variant: 'Size M', priceCents: 1600, qty: 1 },
    { id: 3, name: 'T-Shirt', variant: 'Size L', priceCents: 1600, qty: 1 },
  ];
}

export function totals(items, discountApplications, bug = () => false) {
  const subtotal = items.reduce((sum, i) => sum + i.priceCents * i.qty, 0);
  const applications = bug('CART-2') ? discountApplications : Math.min(discountApplications, 1);
  const afterDiscount = Math.round(subtotal * (1 - DISCOUNT_RATE) ** applications);
  const discount = subtotal - afterDiscount;
  const rawTax = afterDiscount * TAX_RATE;
  const tax = bug('CART-1') ? Math.floor(rawTax) : Math.round(rawTax);
  return { subtotal, discount, tax, total: afterDiscount + tax };
}

export function changeQty(items, id, delta, bug = () => false) {
  return items.map((i) => {
    if (i.id !== id) return i;
    const qty = i.qty + delta;
    return { ...i, qty: bug('CART-3') ? qty : Math.max(1, qty) };
  });
}

export function removeItem(items, id, bug = () => false) {
  if (bug('CART-4')) {
    const target = items.find((i) => i.id === id);
    return items.filter((i) => i.name !== target?.name);
  }
  return items.filter((i) => i.id !== id);
}

export function isDiscountCode(code) {
  return code.trim().toUpperCase() === DISCOUNT_CODE;
}

export function money(cents) {
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

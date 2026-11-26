import { expect, test, type Page } from '@playwright/test';

// Default cart: Coffee Beans $19.99 x3, T-Shirt (M) $16.00, T-Shirt (L) $16.00
// Subtotal 91.97 · tax 8.25% of 91.97 = 7.587525 -> $7.59 · total $99.56
// With SAVE10: discount 9.20 -> 82.77 · tax 6.828525 -> $6.83 · total $89.60

const totals = (page: Page) => ({
  subtotal: page.getByTestId('subtotal'),
  discount: page.getByTestId('discount'),
  tax: page.getByTestId('tax'),
  total: page.getByTestId('total'),
});
const row = (page: Page, id: number) => page.getByTestId(`item-${id}`);

test.beforeEach(async ({ page }) => {
  await page.goto('/cart.html');
});

test('totals are correct to the cent', async ({ page }) => {
  const t = totals(page);
  await expect(t.subtotal).toHaveText('$91.97');
  await expect(t.tax).toHaveText('$7.59');
  await expect(t.total).toHaveText('$99.56');
});

test('discount code applies once, even if entered again', async ({ page }) => {
  await page.getByLabel('Discount code').fill('SAVE10');
  await page.getByRole('button', { name: 'Apply' }).click();
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByTestId('code-message')).toHaveText('Code already applied.');
  const t = totals(page);
  await expect(t.discount).toHaveText('-$9.20');
  await expect(t.total).toHaveText('$89.60');
});

test('discount code is not case-sensitive', async ({ page }) => {
  await page.getByLabel('Discount code').fill('save10');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(totals(page).discount).toHaveText('-$9.20');
});

test('invalid discount code is rejected', async ({ page }) => {
  await page.getByLabel('Discount code').fill('FREE100');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByTestId('code-message')).toHaveText('That code is not valid.');
  await expect(totals(page).discount).toHaveText('$0.00');
});

test('quantity never drops below 1', async ({ page }) => {
  const coffee = row(page, 1);
  const decrease = page.getByRole('button', { name: 'Decrease quantity of Coffee Beans (1 lb bag)' });
  for (let i = 0; i < 5; i++) await decrease.click();
  await expect(coffee.getByTestId('qty')).toHaveText('1');
  await expect(totals(page).subtotal).toHaveText('$51.99');
});

test('quantity can be increased', async ({ page }) => {
  await page.getByRole('button', { name: 'Increase quantity of T-Shirt (Size M)' }).click();
  await expect(row(page, 2).getByTestId('qty')).toHaveText('2');
  await expect(totals(page).subtotal).toHaveText('$107.97');
});

test('removing one variant keeps the other', async ({ page }) => {
  await page.getByRole('button', { name: 'Remove T-Shirt (Size M)' }).click();
  await expect(row(page, 2)).toHaveCount(0);
  await expect(row(page, 3)).toBeVisible();
  await expect(totals(page).subtotal).toHaveText('$75.97');
});

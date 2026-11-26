import { expect, test } from '@playwright/test';

const prices = async (page) =>
  (await page.locator('#rows td.price').allTextContents()).map((t: string) => Number(t.replace('$', '')));

test.beforeEach(async ({ page }) => {
  await page.goto('/table.html');
  await expect(page.locator('#rows tr')).toHaveCount(5);
});

test('price column sorts numerically, both directions', async ({ page }) => {
  await page.getByRole('button', { name: 'Price' }).click();
  const asc = await prices(page);
  expect(asc).toEqual([...asc].sort((a, b) => a - b));

  await page.getByRole('button', { name: 'Price' }).click();
  const desc = await prices(page);
  expect(desc).toEqual([...desc].sort((a, b) => b - a));
});

test('name column sorts alphabetically', async ({ page }) => {
  await page.getByRole('button', { name: 'Name' }).click();
  const names = await page.locator('#rows td.name').allTextContents();
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
});

test('paging through the table reaches every product', async ({ page, request }) => {
  const { total } = await (await request.get('/api/products?page=1&size=5')).json();
  const seen = new Set<string>();
  for (;;) {
    for (const name of await page.locator('#rows td.name').allTextContents()) seen.add(name);
    const next = page.getByRole('button', { name: 'Next' });
    if (await next.isDisabled()) break;
    const info = await page.getByTestId('page-info').textContent();
    await next.click();
    await expect(page.getByTestId('page-info')).not.toHaveText(info ?? '');
  }
  expect(seen.size).toBe(total);
});

test('search ignores capitalization', async ({ page }) => {
  await page.getByLabel('Search').fill('usb');
  await expect(page.locator('#rows td.name')).toHaveText(['USB Cable', 'USB Flash Drive']);
});

test.describe('Products API', () => {
  for (const query of ['page=0', 'page=-1', 'page=abc', 'page=1.5', 'size=0', 'size=1000']) {
    test(`rejects invalid input: ${query}`, async ({ request }) => {
      const res = await request.get(`/api/products?${query}`);
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toBeTruthy();
    });
  }

  test('pages add up to the total', async ({ request }) => {
    const first = await (await request.get('/api/products?page=1&size=5')).json();
    expect(first.totalPages).toBe(Math.ceil(first.total / 5));
    let count = 0;
    for (let p = 1; p <= first.totalPages; p++) {
      count += (await (await request.get(`/api/products?page=${p}&size=5`)).json()).items.length;
    }
    expect(count).toBe(first.total);
  });

  test('search is case-insensitive', async ({ request }) => {
    const upper = await (await request.get('/api/products?q=LAMP')).json();
    const lower = await (await request.get('/api/products?q=lamp')).json();
    expect(upper.total).toBe(1);
    expect(lower.items).toEqual(upper.items);
  });
});

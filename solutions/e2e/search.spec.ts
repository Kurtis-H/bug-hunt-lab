import { expect, test, type Request } from '@playwright/test';

const isSearch = (r: Request) => new URL(r.url()).pathname === '/api/search';
const queryOf = (url: string) => new URL(url).searchParams.get('q');

test.beforeEach(async ({ page }) => {
  await page.goto('/search.html');
});

test('results match the query', async ({ page }) => {
  await page.getByLabel('Search fruit').fill('melon');
  await expect(page.getByTestId('results').locator('li')).toHaveText(['melon', 'watermelon']);
  await expect(page.getByTestId('spinner')).toBeHidden();
});

test('a slow, older response never overwrites newer results (race condition)', async ({ page }) => {
  // The API answers short queries slowly, so "ap" comes back AFTER "apple".
  const slowAp = page.waitForResponse((r) => isSearch(r.request()) && queryOf(r.url()) === 'ap');
  const box = page.getByLabel('Search fruit');
  await box.pressSequentially('ap');
  await page.waitForTimeout(300); // the user pauses long enough for "ap" to be sent...
  await box.pressSequentially('ple'); // ...then keeps typing
  await expect(page.getByTestId('results').locator('li')).toHaveText(['apple', 'pineapple']);
  await slowAp; // wait for the stale response to land, then check nothing changed
  await page.waitForTimeout(100);
  await expect(page.getByTestId('results').locator('li')).toHaveText(['apple', 'pineapple']);
  await expect(page.getByTestId('spinner')).toBeHidden();
});

test('typing a word sends at most 2 requests (debounced)', async ({ page }) => {
  const sent: string[] = [];
  page.on('request', (r) => {
    if (isSearch(r)) sent.push(queryOf(r.url()) ?? '');
  });
  await page.getByLabel('Search fruit').pressSequentially('watermelon', { delay: 40 });
  await expect(page.getByTestId('results').locator('li')).toHaveText(['watermelon']);
  expect(sent.length, `requests sent: ${sent.join(', ')}`).toBeLessThanOrEqual(2);
});

test('a server error shows a message and stops loading', async ({ page }) => {
  await page.getByLabel('Search fruit').fill('error');
  await expect(page.getByTestId('search-error')).toHaveText('Search is unavailable right now. Please try again.');
  await expect(page.getByTestId('spinner')).toBeHidden();
});

test('recovers after an error', async ({ page }) => {
  const box = page.getByLabel('Search fruit');
  await box.fill('error');
  await expect(page.getByTestId('search-error')).not.toBeEmpty();
  await box.fill('kiwi');
  await expect(page.getByTestId('results').locator('li')).toHaveText(['kiwi']);
  await expect(page.getByTestId('search-error')).toBeEmpty();
});

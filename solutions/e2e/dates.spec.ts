import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/dates.html');
});

test.describe('age calculator', () => {
  const cases: Array<[birth: string, today: string, age: string]> = [
    ['2000-12-15', '2026-11-25', '25'], // birthday later this year: not 26 yet
    ['2000-11-25', '2026-11-25', '26'], // on the birthday
    ['2000-11-26', '2026-11-25', '25'], // the day before the birthday
    ['2008-02-29', '2026-02-28', '17'], // leap-day birthday, non-leap year
  ];
  for (const [birth, today, age] of cases) {
    test(`born ${birth}, on ${today} -> ${age}`, async ({ page }) => {
      await page.getByLabel('Date of birth').fill(birth);
      await page.getByLabel('Today').fill(today);
      await expect(page.getByTestId('age')).toHaveText(age);
    });
  }
});

test.describe('subscription renewal', () => {
  const cases: Array<[start: string, renewal: string]> = [
    ['2026-03-15', '2026-04-15'],
    ['2026-01-31', '2026-02-28'], // shorter month: clamp, don't roll into March
    ['2028-01-31', '2028-02-29'], // leap year
    ['2026-08-31', '2026-09-30'],
    ['2026-12-31', '2027-01-31'], // year boundary
  ];
  for (const [start, renewal] of cases) {
    test(`${start} -> ${renewal}`, async ({ page }) => {
      await page.getByLabel('Start date').fill(start);
      await expect(page.getByTestId('renewal')).toHaveText(renewal);
    });
  }
});

// Time zone bugs hide on machines (and CI servers) that run in UTC.
// Pin the browser to zones on both sides of UTC to expose them.
for (const timezoneId of ['America/Denver', 'Pacific/Honolulu', 'Asia/Tokyo', 'UTC']) {
  test.describe(`delivery date in ${timezoneId}`, () => {
    test.use({ timezoneId });
    test('shows the date exactly as entered', async ({ page }) => {
      await page.getByLabel('Ship date').fill('2026-03-01');
      await expect(page.getByTestId('ship-message')).toHaveText('Your order ships on March 1, 2026.');
    });
  });
}

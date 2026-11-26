import { expect, test, type Page } from '@playwright/test';

const uniqueEmail = () => `user.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;

async function fillForm(page: Page, overrides: Partial<Record<'name' | 'email' | 'password' | 'confirm' | 'age', string>> = {}) {
  const v = { name: 'Ada Lovelace', email: uniqueEmail(), password: 'correcthorse', age: '30', ...overrides };
  await page.getByLabel('Name').fill(v.name);
  await page.getByLabel('Email').fill(v.email);
  await page.getByLabel('Password', { exact: true }).fill(v.password);
  await page.getByLabel('Confirm password').fill(overrides.confirm ?? v.password);
  await page.getByLabel('Age').fill(v.age);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/signup.html');
});

test('valid signup creates an account', async ({ page }) => {
  await fillForm(page);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByTestId('result')).toContainText('Welcome, Ada Lovelace');
});

for (const email of ['a@b', 'missing-at.example.com', 'two words@example.com', 'x@y.c']) {
  test(`rejects invalid email "${email}"`, async ({ page }) => {
    await fillForm(page, { email });
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByTestId('email-error')).toHaveText('Enter a valid email address');
    await expect(page.getByTestId('result')).not.toContainText('Welcome');
  });
}

test('API also rejects an invalid email (client checks are not enough)', async ({ request }) => {
  const res = await request.post('/api/signup', {
    data: { name: 'A', email: 'a@b', password: 'correcthorse', confirm: 'correcthorse', age: 30 },
  });
  expect(res.status()).toBe(400);
});

test('password of exactly 8 characters is accepted (boundary)', async ({ page }) => {
  await fillForm(page, { password: '12345678' });
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByTestId('password-error')).toBeEmpty();
  await expect(page.getByTestId('result')).toContainText('Welcome');
});

test('password of 7 characters is rejected (boundary)', async ({ page }) => {
  await fillForm(page, { password: '1234567' });
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByTestId('password-error')).toHaveText('Password must be at least 8 characters');
});

test('error message clears once the mistake is fixed', async ({ page }) => {
  await fillForm(page, { email: 'not-an-email' });
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByTestId('email-error')).not.toBeEmpty();

  await page.getByLabel('Email').fill(uniqueEmail());
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByTestId('result')).toContainText('Welcome');
  await expect(page.getByTestId('email-error')).toBeEmpty();
});

test('double-clicking submit sends only one request', async ({ page }) => {
  const posts: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().endsWith('/api/signup')) posts.push(r.url());
  });
  await fillForm(page);
  await page.getByRole('button', { name: 'Create account' }).dblclick();
  await expect(page.getByTestId('result')).toContainText('Welcome');
  await page.waitForLoadState('networkidle');
  expect(posts).toHaveLength(1);
});

test('mismatched passwords are rejected', async ({ page }) => {
  await fillForm(page, { password: 'correcthorse', confirm: 'batterystaple' });
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByTestId('confirm-error')).toHaveText('Passwords do not match');
});

test('duplicate email is rejected by the API', async ({ request }) => {
  const data = { name: 'A', email: uniqueEmail(), password: 'correcthorse', confirm: 'correcthorse', age: 30 };
  expect((await request.post('/api/signup', { data })).status()).toBe(201);
  expect((await request.post('/api/signup', { data })).status()).toBe(409);
});

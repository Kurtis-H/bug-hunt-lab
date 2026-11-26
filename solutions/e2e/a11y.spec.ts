import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/a11y.html');
});

test('no automatically detectable WCAG 2.1 AA violations', async ({ page }) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});

test('email field has an accessible name', async ({ page }) => {
  await expect(page.getByLabel('Email address')).toBeVisible();
});

test('can subscribe using only the keyboard', async ({ page }) => {
  const email = page.getByLabel('Email address').or(page.locator('#news-email'));
  await email.fill('kb@example.com');
  await email.press('Tab');
  await expect(page.getByRole('button', { name: 'Subscribe' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('subscribe-result')).toHaveText('Subscribed kb@example.com.');
});

test('terms dialog takes focus, closes with Escape, and returns focus', async ({ page }) => {
  const opener = page.getByRole('button', { name: 'View terms' });
  await opener.focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'Newsletter terms' });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

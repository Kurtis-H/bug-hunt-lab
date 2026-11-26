// 👋 Your tests go in this folder. This example is here to get you started.
//
//   npm test                         run your tests against the correct app (should pass)
//   BUGS=all npm test                run them with every bug on (should fail)
//   npm run scorecard                see exactly which bugs your tests catch
//
// The reference answers are in solutions/. Try not to peek until you've had a go!

import { expect, test } from '@playwright/test';

test('cart shows a subtotal', async ({ page }) => {
  await page.goto('/cart.html');
  await expect(page.getByTestId('subtotal')).toHaveText('$91.97');
});

test('signup page loads', async ({ page }) => {
  await page.goto('/signup.html');
  await expect(page.getByRole('heading', { name: 'Signup form' })).toBeVisible();
});

// Ideas to try next:
//  - What should the tax and total be? Work it out by hand.
//  - What does the signup form do with an email like "a@b"?
//  - What happens if you sort the product table by price?

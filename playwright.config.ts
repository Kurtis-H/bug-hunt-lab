import { defineConfig, devices } from '@playwright/test';

/**
 * TEST_DIR  which suite to run: tests (yours, default) or solutions/e2e (the reference suite)
 * BUGS      which bugs the auto-started server has on: none (default), all, or e.g. CART-1,DATES-3
 * BASE_URL  point at an already-running server instead (the scorecard does this)
 */
const port = Number(process.env.PORT ?? 3000);
const baseURL = process.env.BASE_URL ?? `http://127.0.0.1:${port}`;
const channel = process.env.PW_CHANNEL;

export default defineConfig({
  testDir: process.env.TEST_DIR ?? 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0, // a lab about finding bugs shouldn't hide them behind retries
  timeout: 20_000,
  expect: { timeout: 4_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
    ...(channel ? { channel } : {}),
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'node app/server.mjs',
        url: `${baseURL}/api/health`,
        reuseExistingServer: !process.env.CI,
        env: { BUGS: process.env.BUGS ?? 'none', PORT: String(port), ALLOW_TOGGLE: '0' },
      },
});

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'https://staging.aungsha.com',
    headless: process.env.HEADLESS === 'true',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      slowMo: Number(process.env.SLOW_MO || 0),
    },
    ...devices['Desktop Chrome'],
  },
});

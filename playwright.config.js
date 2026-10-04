const { defineConfig, devices } = require('@playwright/test');
const os = require('node:os');
const path = require('node:path');

// Keep browsers outside Cursor sandbox temp cache so Chromium is not re-downloaded every session.
const persistentBrowsersPath = path.join(__dirname, '.playwright-browsers');
if (
  !process.env.PLAYWRIGHT_BROWSERS_PATH
  || /cursor-sandbox-cache|\\Temp\\|\/tmp\//i.test(process.env.PLAYWRIGHT_BROWSERS_PATH)
) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = persistentBrowsersPath;
}

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        detail: true,
        suiteTitle: true,
        environmentInfo: {
          os_platform: os.platform(),
          os_release: os.release(),
          node_version: process.version,
          base_url: 'https://staging.aungsha.com',
        },
      },
    ],
  ],
  use: {
    baseURL: 'https://staging.aungsha.com',
    headless: process.env.HEADLESS === 'true',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      slowMo: Number(process.env.SLOW_MO || 0),
    },
    ...devices['Desktop Chrome'],
  },
});

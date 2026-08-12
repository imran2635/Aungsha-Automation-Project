const { test, expect } = require('@playwright/test');

const EMAIL = process.env.AUNGSHA_EMAIL;
const PASSWORD = process.env.AUNGSHA_PASSWORD;

test('log in to Aungsha with email', async ({ page }) => {
  await page.goto('/en/sign-in', { waitUntil: 'domcontentloaded' });

  const emailTab = page.getByRole('button', { name: /^email$/i });
  if (await emailTab.isVisible().catch(() => false)) {
    await emailTab.click();
  }

  await page.getByPlaceholder(/enter your email address/i).fill(EMAIL);
  await page.getByPlaceholder(/enter your password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /^continue$/i }).click();

  await expect(page).not.toHaveURL(/\/en\/sign-in(?:\?|$)/, {
    timeout: 20_000,
  });
});

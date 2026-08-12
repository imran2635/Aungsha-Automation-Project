const { test, expect } = require('@playwright/test');

const EMAIL = process.env.AUNGSHA_EMAIL;
const PASSWORD = process.env.AUNGSHA_PASSWORD;

test('open the prebook project details page', async ({ page }) => {
  await page.goto('/en/sign-in', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/en\/sign-in(?:\?|$)/);
  console.log('✅ Sign-in page opened: PASSED');

  // Wait for React hydration; clicking a tab before this can be reset to Phone.
  await page.waitForTimeout(1_500);
  const emailInput = page.getByPlaceholder(/enter your email address/i);
  if (!(await emailInput.isVisible().catch(() => false))) {
    const emailTab = page.getByRole('tab', { name: /^email$/i });
    await emailTab.click();
    await expect(emailTab).toHaveAttribute('aria-selected', 'true');
    await expect(emailInput).toBeVisible();
  }

  await emailInput.fill(EMAIL);
  const passwordInput = page.getByPlaceholder(/enter your password/i);
  await passwordInput.fill(PASSWORD);
  await expect(emailInput).toHaveValue(EMAIL);
  await expect(passwordInput).toHaveValue(PASSWORD);
  await page.getByRole('button', { name: /^continue$/i }).click();
  await expect(page).not.toHaveURL(/\/en\/sign-in(?:\?|$)/, {
    timeout: 20_000,
  });
  console.log('✅ Login successful: PASSED');

  await page.goto('/en/projects', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /all projects/i })).toBeVisible();
  console.log('✅ Projects page opened: PASSED');

  const prebookLink = page.getByRole('link', { name: /^prebook$/i }).first();
  await expect(prebookLink).toHaveAttribute(
    'href',
    '/en/projects/purbachal-hill-city-2/checkout',
  );
  console.log('✅ Prebook link found: PASSED');
  await prebookLink.click();

  await expect(page).toHaveURL(
    /\/en\/projects\/purbachal-hill-city-2\/checkout\/?(?:\?|$)/,
    { timeout: 20_000 },
  );
  console.log('✅ Prebook checkout page opened: PASSED');
});

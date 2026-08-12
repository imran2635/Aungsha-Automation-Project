const { test, expect } = require('@playwright/test');

const EMAIL = process.env.AUNGSHA_EMAIL;
const PASSWORD = process.env.AUNGSHA_PASSWORD;

test('create an Aungsha account with email', async ({ page }) => {
  // Visit the home page first, as requested.
  await page.goto('/en', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/en\/?$/);

  // Open the signup page directly. This avoids relying on changing homepage UI.
  await page.goto('/en/sign-up?next=%2Fen', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/en\/sign-up/);

  // Select email signup if the Phone tab is active by default.
  const emailTab = page.getByRole('button', { name: /^email$/i });
  if (await emailTab.isVisible().catch(() => false)) {
    await emailTab.click();
  }

  await page.getByPlaceholder(/enter your email address/i).fill(EMAIL);
  await page.getByPlaceholder(/create a strong password/i).fill(PASSWORD);
  await page.getByPlaceholder(/re-enter your password/i).fill(PASSWORD);

  const termsCheckbox = page.getByRole('checkbox');
  await termsCheckbox.check();
  await expect(termsCheckbox).toBeChecked();

  await page.getByRole('button', { name: /^continue$/i }).click();

  // Success can either navigate away or show an email/OTP verification step.
  const verificationStep = page
    .getByText(/verification code|enter.*(?:otp|code)|verify.*email/i)
    .first();

  await expect
    .poll(
      async () =>
        !/\/en\/sign-up(?:\?|$)/.test(page.url()) ||
        (await verificationStep.isVisible().catch(() => false)),
      {
        message: 'Expected signup to continue to email/OTP verification',
        timeout: 20_000,
      },
    )
    .toBe(true);
});

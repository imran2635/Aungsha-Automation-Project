const { test, expect } = require('@playwright/test');

const EMAIL = process.env.AUNGSHA_EMAIL;
const PASSWORD = process.env.AUNGSHA_PASSWORD;
const PHONE = process.env.AUNGSHA_PHONE;
const SANDBOX_PIN = process.env.SHURJOPAY_PIN;

test('complete the Cloud 9 sandbox buy flow', async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto('/en/sign-in', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/en\/sign-in(?:\?|$)/);
  console.log('✅ Sign-in page opened: PASSED');

  await page.waitForTimeout(1_500);
  const emailInput = page.getByPlaceholder(/enter your email address/i);
  if (!(await emailInput.isVisible().catch(() => false))) {
    const emailTab = page.getByRole('tab', { name: /^email$/i });
    await emailTab.click();
    await expect(emailTab).toHaveAttribute('aria-selected', 'true');
    await expect(emailInput).toBeVisible();
  }

  const passwordInput = page.getByPlaceholder(/enter your password/i);
  await emailInput.fill(EMAIL);
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

  const cloud9Link = page
    .getByRole('link', { name: /^cloud 9 \(inani\)$/i })
    .first();
  await expect(cloud9Link).toBeVisible();
  await cloud9Link.click();
  await expect(page).toHaveURL(/\/en\/projects\/[^/]+\/?(?:\?|$)/);
  console.log('✅ Cloud 9 details page opened: PASSED');

  const buyNowLink = page.getByRole('link', {
    name: /^(?:buy|prebook) now$/i,
  });
  await expect(buyNowLink).toBeVisible();
  await buyNowLink.click();
  await expect(page).toHaveURL(/\/en\/projects\/.+\/checkout\/?(?:\?|$)/, {
    timeout: 20_000,
  });
  console.log('✅ Checkout page opened: PASSED');

  const withoutNominee = page.getByRole('button', {
    name: /continue without nominee/i,
  });
  if (await withoutNominee.isVisible().catch(() => false)) {
    await withoutNominee.click();
  }

  const phoneInput = page.getByPlaceholder(/enter your phone number/i);
  await phoneInput.fill(PHONE);
  await expect(phoneInput).toHaveValue(PHONE);
  console.log('✅ Checkout information completed: PASSED');

  await page.getByRole('button', { name: /^buy$/i }).click();
  await expect(page.getByText(/select payment method/i)).toBeVisible();
  console.log('✅ Payment method drawer opened: PASSED');

  const bkashOption = page.getByText(/pay with bkash/i);
  if (await bkashOption.isVisible().catch(() => false)) {
    await bkashOption.click();
  }
  await page.getByRole('button', { name: /make payment/i }).click();

  await expect(page).toHaveURL(/sandbox\.securepay\.shurjopayment\.com/i, {
    timeout: 30_000,
  });
  console.log('✅ ShurjoPay Sandbox opened: PASSED');

  const mobileBankingTab = page.getByRole('tab', { name: /^mbanking$/i });
  if ((await mobileBankingTab.getAttribute('aria-selected')) !== 'true') {
    await mobileBankingTab.click();
  }
  await page.getByRole('textbox', { name: /mobile number/i }).fill(PHONE);
  await page.getByRole('textbox', { name: /pin number/i }).fill(SANDBOX_PIN);
  await expect(page.getByRole('button', { name: /^success/i })).toBeEnabled();
  await page.getByRole('button', { name: /^success/i }).click();

  await expect(page).toHaveURL(/staging\.aungsha\.com/i, {
    timeout: 30_000,
  });
  console.log('✅ Sandbox payment successful: PASSED');
  console.log('✅ Full project buy flow completed: PASSED');
});

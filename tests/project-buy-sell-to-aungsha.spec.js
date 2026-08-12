const { test, expect } = require('@playwright/test');

const EMAIL = process.env.AUNGSHA_EMAIL;
const PASSWORD = process.env.AUNGSHA_PASSWORD;
const PHONE = process.env.AUNGSHA_PHONE;
const SANDBOX_PIN = process.env.SHURJOPAY_PIN;

test('Project buy sell to Aungsha', async ({ page }) => {
  test.setTimeout(180_000);

  await page.goto('/en/sign-in', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1_500);

  const acceptCookies = page.getByRole('button', { name: /^accept$/i });
  if (await acceptCookies.isVisible().catch(() => false)) {
    await acceptCookies.click();
    await expect(acceptCookies).toBeHidden();
  }
  console.log('[PASSED] Cookie consent handled');

  const emailInput = page.getByPlaceholder(/enter your email address/i);
  const emailTab = page.getByRole('tab', { name: /^email$/i });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (await emailInput.isVisible().catch(() => false)) break;
    await emailTab.click();
    await page.waitForTimeout(500);
  }
  await expect(emailInput).toBeVisible();
  await emailInput.fill(EMAIL);
  await page.getByPlaceholder(/enter your password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /^continue$/i }).click();
  await expect(page).not.toHaveURL(/\/en\/sign-in(?:\?|$)/, {
    timeout: 20_000,
  });
  console.log('[PASSED] Login successful');

  await page.goto('/en/projects', { waitUntil: 'domcontentloaded' });
  const cloud9Project = page
    .getByRole('link', { name: /^cloud 9 \(inani\)$/i })
    .first();
  await expect(cloud9Project).toBeVisible();
  await cloud9Project.click();
  await expect(page).toHaveURL(/\/en\/projects\/[^/]+\/?(?:\?|$)/);
  console.log('[PASSED] Cloud 9 project details opened');

  await page
    .getByRole('link', { name: /^(?:buy|prebook) now$/i })
    .click();
  await expect(page).toHaveURL(/\/en\/projects\/.+\/checkout\/?(?:\?|$)/, {
    timeout: 20_000,
  });

  const withoutNominee = page.getByRole('button', {
    name: /continue without nominee/i,
  });
  if (await withoutNominee.isVisible().catch(() => false)) {
    await withoutNominee.click();
  }

  await page.getByPlaceholder(/enter your phone number/i).fill(PHONE);
  await page.getByRole('button', { name: /^buy$/i }).click();
  await expect(page.getByText(/select payment method/i)).toBeVisible();

  const bkashOption = page.getByText(/pay with bkash/i);
  if (await bkashOption.isVisible().catch(() => false)) {
    await bkashOption.click();
  }
  await page.getByRole('button', { name: /make payment/i }).click();

  await expect(page).toHaveURL(/sandbox\.securepay\.shurjopayment\.com/i, {
    timeout: 30_000,
  });
  const mobileBankingTab = page.getByRole('tab', { name: /^mbanking$/i });
  if ((await mobileBankingTab.getAttribute('aria-selected')) !== 'true') {
    await mobileBankingTab.click();
  }
  await page.getByRole('textbox', { name: /mobile number/i }).fill(PHONE);
  await page.getByRole('textbox', { name: /pin number/i }).fill(SANDBOX_PIN);
  await page.getByRole('button', { name: /^success/i }).click();
  await expect(page).toHaveURL(/staging\.aungsha\.com/i, {
    timeout: 30_000,
  });
  console.log('[PASSED] One Cloud 9 unit purchased');

  await page.goto('/en/dashboard/my-portfolio', {
    waitUntil: 'domcontentloaded',
  });
  const cloud9Card = page
    .locator('article')
    .filter({ hasText: /^Cloud 9 \(Inani\)/i });
  await expect(cloud9Card).toBeVisible();
  await cloud9Card.getByRole('link', { name: /^view details$/i }).click();

  await expect(page).toHaveURL(
    /\/en\/dashboard\/my-portfolio\/[^/]+\/?(?:\?|$)/,
  );
  const sellToAungsha = page
    .locator('div[role="button"]')
    .filter({ hasText: /^Sell to Aungsha[\s\S]*Private buyback/i });
  await sellToAungsha.click();
  await expect(
    sellToAungsha.getByRole('checkbox'),
  ).toHaveAttribute('aria-checked', 'true');

  const sellSharesButton = page.getByRole('button', {
    name: /^sell shares$/i,
  });
  await expect(sellSharesButton).toBeEnabled();
  await sellSharesButton.click();
  await expect(
    page.getByText(/your shares have been sold to Aungsha/i),
  ).toBeVisible();
  console.log('[PASSED] One Cloud 9 unit sold to Aungsha');

  await page.getByRole('link', { name: /^go to funds$/i }).click();
  await expect(page).toHaveURL(/\/en\/dashboard\/my-points\/?(?:\?|$)/);
  await expect(page.getByRole('heading', { name: /^funds$/i })).toBeVisible();
  await expect(page.getByText(/^wallet transaction$/i).first()).toBeVisible();
  console.log('[PASSED] Funds page verified');

  await page.goto('/en/dashboard', { waitUntil: 'domcontentloaded' });
  await page.locator('a[href="/en/dashboard/my-portfolio"]').first().click();
  await expect(page).toHaveURL(/\/en\/dashboard\/my-portfolio\/?(?:\?|$)/);

  const finalCloud9Card = page
    .locator('article')
    .filter({ hasText: /^Cloud 9 \(Inani\)/i });
  await expect(finalCloud9Card).toBeVisible();
  await finalCloud9Card.getByRole('link', { name: /^view details$/i }).click();
  await expect(page).toHaveURL(
    /\/en\/dashboard\/my-portfolio\/[^/]+\/?(?:\?|$)/,
  );
  await expect(
    page.getByRole('heading', { level: 1, name: /^cloud 9 \(inani\)$/i }),
  ).toBeVisible();
  await expect(page.getByText(/^how would you like to sell\?$/i)).toBeVisible();
  console.log('[PASSED] Cloud 9 portfolio details page opened');
});

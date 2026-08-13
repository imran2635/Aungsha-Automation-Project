const { test, expect } = require('@playwright/test');

const EMAIL = process.env.AUNGSHA_EMAIL;
const PASSWORD = process.env.AUNGSHA_PASSWORD;
const PHONE = process.env.AUNGSHA_PHONE;
const SANDBOX_PIN = process.env.SHURJOPAY_PIN;
const BKASH_SANDBOX_PHONE = process.env.BKASH_SANDBOX_PHONE || PHONE;
const BKASH_SANDBOX_OTP = process.env.BKASH_SANDBOX_OTP || '123456';
const BKASH_SANDBOX_PIN = process.env.BKASH_SANDBOX_PIN || '12121';
const ASKING_PRICE = process.env.MARKETPLACE_ASKING_PRICE || '1500';
const FORMATTED_ASKING_PRICE = Number(ASKING_PRICE).toLocaleString('en-US');
const RESUME_AFTER_PURCHASE = process.env.MARKETPLACE_RESUME_AFTER_PURCHASE === 'true';

async function gotoWithRetry(page, url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      return;
    } catch (error) {
      lastError = error;
      if (!/ERR_ABORTED/i.test(String(error)) || attempt === 3) throw error;
      await page.waitForTimeout(1_500);
    }
  }
  throw lastError;
}

test('Project buy sell to market place', async ({ page }) => {
  test.setTimeout(240_000);

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

  if (!RESUME_AFTER_PURCHASE) {
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
  console.log('[PASSED] Checkout page opened');

  const withoutNominee = page.getByRole('button', {
    name: /continue without nominee/i,
  });
  if (await withoutNominee.isVisible().catch(() => false)) {
    await withoutNominee.click();
  }

  const phoneInput = page.getByPlaceholder(/enter your phone number/i);
  await phoneInput.fill(PHONE);
  await expect(phoneInput).toHaveValue(PHONE);
  console.log('[PASSED] Checkout information completed');

  const buyButton = page.getByRole('button', { name: /^buy$/i });
  const paymentMethodDialog = page.getByText(/select payment method/i);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await buyButton.click();
    if (await paymentMethodDialog.isVisible({ timeout: 15_000 }).catch(() => false)) break;
    if (attempt < 3) await page.waitForTimeout(2_000);
  }
  await expect(paymentMethodDialog).toBeVisible({ timeout: 30_000 });
  const bkashOption = page.getByText(/pay with bkash/i);
  if (await bkashOption.isVisible().catch(() => false)) {
    await bkashOption.click();
  }
  await page.getByRole('button', { name: /make payment/i }).click();

  await expect(page).toHaveURL(
    /(?:sandbox\.securepay\.shurjopayment\.com|sandbox\.payment\.bkash\.com)/i,
    { timeout: 30_000 },
  );
  console.log('[PASSED] ShurjoPay sandbox opened');

  if (/sandbox\.payment\.bkash\.com/i.test(page.url())) {
    const confirmBkashStep = async (prompt, value) => {
      await expect(page.locator('body')).toContainText(prompt, { timeout: 20_000 });
      await page.locator('input:visible').first().fill(value);
      const confirm = page.getByRole('button', { name: /^confirm$/i });
      await expect(confirm).toBeEnabled();
      await confirm.click();
    };
    await confirmBkashStep(/your bkash account number/i, BKASH_SANDBOX_PHONE);
    await confirmBkashStep(/verification code/i, BKASH_SANDBOX_OTP);
    await confirmBkashStep(/enter pin/i, BKASH_SANDBOX_PIN);
  } else {
    const mobileBankingTab = page.getByRole('tab', { name: /^mbanking$/i });
    if ((await mobileBankingTab.getAttribute('aria-selected')) !== 'true') {
      await mobileBankingTab.click();
    }
    await page.getByRole('textbox', { name: /mobile number/i }).fill(PHONE);
    await page.getByRole('textbox', { name: /pin number/i }).fill(SANDBOX_PIN);
    await page.getByRole('button', { name: /^success/i }).click();
  }
  await expect(page).toHaveURL(/staging\.aungsha\.com/i, {
    timeout: 30_000,
  });
  console.log('[PASSED] One Cloud 9 unit purchased');
  } else {
    console.log('[PASSED] Existing purchased unit reused; duplicate purchase skipped');
  }

  await gotoWithRetry(page, '/en/dashboard/my-portfolio');
  const cloud9Card = page
    .locator('article')
    .filter({ hasText: /^Cloud 9 \(Inani\)/i });
  await expect(cloud9Card).toBeVisible();
  await cloud9Card.getByRole('link', { name: /^view details$/i }).click();
  await expect(page).toHaveURL(
    /\/en\/dashboard\/my-portfolio\/[^/]+\/?(?:\?|$)/,
  );
  console.log('[PASSED] Cloud 9 portfolio details opened');

  const marketplaceOption = page
    .locator('div[role="button"]')
    .filter({ hasText: /^Go to marketplace[\s\S]*asking price/i });
  await marketplaceOption.click();
  await expect(marketplaceOption.getByRole('checkbox')).toHaveAttribute(
    'aria-checked',
    'true',
  );
  console.log('[PASSED] Go to marketplace selected');

  const oneUnitAungshaReservations = page
    .locator('button:visible')
    .filter({ hasText: /Aungsha Share/i })
    .filter({ hasText: /1 units/i });
  await expect(oneUnitAungshaReservations.last()).toBeVisible();
  await oneUnitAungshaReservations.last().click();
  await expect(page.getByText(/maximum available:\s*1/i)).toBeVisible();
  console.log('[PASSED] Newly purchased one-unit reservation selected');

  const askingPrice = page.getByLabel(/selling price per unit/i);
  await askingPrice.fill(ASKING_PRICE);
  await expect(askingPrice).toHaveValue(ASKING_PRICE);

  const sellSharesButton = page.getByRole('button', {
    name: /^sell shares$/i,
  });
  await expect(sellSharesButton).toBeEnabled();
  await sellSharesButton.click();
  await expect(
    page.getByText(/resale offer created successfully/i),
  ).toBeVisible();
  console.log(`[PASSED] Marketplace resale offer created at BDT ${ASKING_PRICE}`);

  await page.getByRole('link', { name: /^my listings$/i }).last().click();
  await expect(page).toHaveURL(/\/en\/dashboard\/sell-shares\/?(?:\?|$)/);

  const dashboardListing = page
    .locator('article:visible')
    .filter({ hasText: /Cloud 9 \(Inani\)/i })
    .filter({ hasText: new RegExp(FORMATTED_ASKING_PRICE) })
    .first();
  await expect(dashboardListing).toBeVisible();
  await expect(dashboardListing.getByText(/^active$/i).last()).toBeVisible();
  await expect(dashboardListing.getByText(/^1$/).last()).toBeVisible();
  console.log('[PASSED] Listing is active in dashboard My Listings');

  const homeLink = page
    .locator('a:visible')
    .filter({ hasText: /^home$/i })
    .first();
  await expect(homeLink).toBeVisible();
  await homeLink.click();
  await expect(page).toHaveURL(/\/en(?:\/dashboard)?\/?(?:\?|$)/);
  console.log('[PASSED] Home opened from dashboard My Listings');

  const marketplaceLink = page
    .locator('a[href="/en/marketplace"]:visible')
    .first();
  await expect(marketplaceLink).toBeVisible();
  await marketplaceLink.click();
  await expect(page.getByRole('heading', { name: /^all projects$/i })).toBeVisible();
  console.log('[PASSED] Marketplace opened from Home');

  await page.getByRole('button', { name: /^my listings$/i }).click();
  console.log('[PASSED] Marketplace My Listings selected');

  const marketplaceListing = page
    .locator('article:visible')
    .filter({ hasText: /Cloud 9 \(Inani\)/i })
    .filter({ hasText: new RegExp(FORMATTED_ASKING_PRICE) })
    .first();
  await expect(marketplaceListing).toBeVisible();
  await expect(marketplaceListing.getByText(/Imran Bponi/i).last()).toBeVisible();
  await expect(
    marketplaceListing.getByRole('button', { name: /^cancel sell$/i }),
  ).toBeVisible();
  console.log('[PASSED] Listing is visible in Marketplace My Listings');

  await page.goto('/en/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/en\/dashboard\/?(?:\?|$)/);
  console.log('[PASSED] Dashboard opened');

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
  console.log('[PASSED] Final Cloud 9 portfolio details page opened');
});

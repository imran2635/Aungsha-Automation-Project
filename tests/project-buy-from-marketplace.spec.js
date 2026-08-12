const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const EMAIL = process.env.AUNGSHA_EMAIL;
const PASSWORD = process.env.AUNGSHA_PASSWORD;
const PHONE = process.env.AUNGSHA_PHONE;
const SANDBOX_PIN = process.env.SHURJOPAY_PIN;
const DOWNLOAD_DIR = path.resolve(__dirname, '..', 'downloads');

async function downloadWithRetry(page, button, label) {
  await expect(button).toBeEnabled({ timeout: 30_000 });

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const downloadPromise = page
      .waitForEvent('download', { timeout: 20_000 })
      .catch(() => null);
    await button.click();
    const download = await downloadPromise;
    if (download) return download;

    console.log(`[WAITING] ${label} is still being prepared (attempt ${attempt}/3)`);
    await page.waitForTimeout(3_000);
  }

  throw new Error(`${label} download did not start after 3 attempts`);
}

test('Project Buy to Market place', async ({ page }) => {
  test.setTimeout(240_000);
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

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

  const marketplaceLink = page
    .locator('a[href="/en/marketplace"]:visible')
    .first();
  if (await marketplaceLink.isVisible().catch(() => false)) {
    await marketplaceLink.click();
  } else {
    await page.goto('/en/marketplace', { waitUntil: 'domcontentloaded' });
  }
  await expect(page).toHaveURL(/\/en\/marketplace\/?(?:\?|$)/);
  await expect(page.getByRole('heading', { name: /^all projects$/i })).toBeVisible();
  console.log('[PASSED] Marketplace opened');

  const purchasableCards = page
    .locator('article:visible')
    .filter({ has: page.getByRole('link', { name: /^buy now$/i }) });
  const purchasableCount = await purchasableCards.count();
  expect(purchasableCount, 'Expected at least one purchasable marketplace listing').toBeGreaterThan(0);

  const randomIndex = Math.floor(Math.random() * purchasableCount);
  const selectedCard = purchasableCards.nth(randomIndex);
  const projectLink = selectedCard
    .locator('a[href*="/en/marketplace/"]')
    .filter({ hasText: /\S/ })
    .first();
  const projectName = (await projectLink.innerText()).trim();
  expect(projectName).toBeTruthy();
  console.log(`[PASSED] Random purchasable share selected: ${projectName}`);

  await selectedCard.getByRole('link', { name: /^buy now$/i }).click();
  await expect(page).toHaveURL(/\/en\/marketplace\/[^/]+\/checkout\/?(?:\?|$)/, {
    timeout: 20_000,
  });
  await expect(page.getByText(/^order summary$/i)).toBeVisible();
  console.log('[PASSED] Marketplace checkout opened');

  const buyButton = page.getByRole('button', { name: /^buy$/i });
  await expect(buyButton).toBeEnabled();
  await buyButton.click();
  await expect(page.getByText(/select payment method/i)).toBeVisible();

  const bkashOption = page.getByText(/pay with bkash/i);
  if (await bkashOption.isVisible().catch(() => false)) {
    await bkashOption.click();
  }
  await page.getByRole('button', { name: /make payment/i }).click();
  await expect(page).toHaveURL(/sandbox\.securepay\.shurjopayment\.com/i, {
    timeout: 30_000,
  });
  console.log('[PASSED] ShurjoPay sandbox opened');

  const mobileBankingTab = page.getByRole('tab', { name: /^mbanking$/i });
  if ((await mobileBankingTab.getAttribute('aria-selected')) !== 'true') {
    await mobileBankingTab.click();
  }
  await page.getByRole('textbox', { name: /mobile number/i }).fill(PHONE);
  await page.getByRole('textbox', { name: /pin number/i }).fill(SANDBOX_PIN);
  await page.getByRole('button', { name: /^success/i }).click();

  await expect(page).toHaveURL(/staging\.aungsha\.com\/en\/payment\/success/i, {
    timeout: 30_000,
  });
  await expect(page.getByText(/purchase successful/i)).toBeVisible();
  console.log(`[PASSED] Marketplace share purchased: ${projectName}`);

  const downloadTimestamp = Date.now();
  const invoiceButton = page.getByTitle(/download receipt/i);
  const invoiceDownload = await downloadWithRetry(
    page,
    invoiceButton,
    'Invoice',
  );
  const invoicePath = path.join(
    DOWNLOAD_DIR,
    `marketplace-${downloadTimestamp}-${invoiceDownload.suggestedFilename() || 'invoice.pdf'}`,
  );
  await invoiceDownload.saveAs(invoicePath);
  expect(fs.existsSync(invoicePath)).toBe(true);
  console.log(`[PASSED] Invoice downloaded: ${invoicePath}`);

  const certificateButton = page.getByTitle(/ownership certificate/i);
  const certificateDownload = await downloadWithRetry(
    page,
    certificateButton,
    'Ownership certificate',
  );
  const certificatePath = path.join(
    DOWNLOAD_DIR,
    `marketplace-${downloadTimestamp}-${certificateDownload.suggestedFilename() || 'ownership-certificate.pdf'}`,
  );
  await certificateDownload.saveAs(certificatePath);
  expect(fs.existsSync(certificatePath)).toBe(true);
  console.log(`[PASSED] Ownership certificate downloaded: ${certificatePath}`);

  await page.getByRole('link', { name: /^my property holdings$/i }).click();
  await expect(page).toHaveURL(/\/en\/dashboard\/my-portfolio\/?(?:\?|$)/);
  console.log('[PASSED] My Property Holdings opened');

  const purchasedHolding = page
    .locator('article:visible')
    .filter({ hasText: new RegExp(projectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
    .first();
  await expect(purchasedHolding).toBeVisible();
  console.log(`[PASSED] Purchased project is visible in holdings: ${projectName}`);

  await purchasedHolding.getByRole('link', { name: /^view details$/i }).click();
  await expect(page).toHaveURL(
    /\/en\/dashboard\/my-portfolio\/[^/]+\/?(?:\?|$)/,
  );
  await expect(
    page.getByRole('heading', { level: 1, name: new RegExp(projectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }),
  ).toBeVisible();
  await expect(page.getByText(/^share activities$/i).last()).toBeVisible();
  console.log(`[PASSED] Holding details verified for purchased project: ${projectName}`);
});

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const EMAIL = process.env.AUNGSHA_EMAIL;
const PASSWORD = process.env.AUNGSHA_PASSWORD;
const DOWNLOAD_DIR = path.resolve(__dirname, '..', 'downloads');

test('download holding documents and open property details', async ({ page }) => {
  test.setTimeout(120_000);
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

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

  await page.goto('/en/dashboard/transactions', {
    waitUntil: 'domcontentloaded',
  });
  await expect(page).toHaveURL(/\/en\/dashboard\/transactions/);
  const latestPaidTransaction = page
    .locator('a[href*="/en/dashboard/transactions/"]:visible')
    .first();
  await expect(latestPaidTransaction).toBeVisible();
  await latestPaidTransaction.click();
  await expect(page).toHaveURL(/\/en\/dashboard\/transactions\/.+type=investment/);
  console.log('✅ Latest paid transaction details opened: PASSED');

  const paymentId = new URL(page.url()).pathname.split('/').pop();
  const detailText = await page.locator('body').innerText();
  const ids = detailText.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
  ) || [];
  const reservationId = ids.find(
    (id) => id.toLowerCase() !== paymentId.toLowerCase(),
  );
  expect(reservationId, 'Expected a reservation ID on transaction details').toBeTruthy();

  await page.goto(
    `/en/payment/success?reservation_id=${reservationId}&payment_id=${paymentId}`,
    { waitUntil: 'domcontentloaded' },
  );
  await expect(page.getByText(/purchase successful/i)).toBeVisible();
  console.log('✅ Paid purchase documents page opened: PASSED');
  await page.waitForTimeout(1_500);

  const invoiceButton = page.getByTitle(/download receipt/i);
  await expect(invoiceButton).toBeEnabled();
  const [invoiceDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 20_000 }),
    invoiceButton.click(),
  ]);
  const invoicePath = path.join(
    DOWNLOAD_DIR,
    invoiceDownload.suggestedFilename() || 'invoice.pdf',
  );
  await invoiceDownload.saveAs(invoicePath);
  expect(fs.existsSync(invoicePath)).toBe(true);
  console.log(`✅ Invoice downloaded: PASSED (${invoicePath})`);

  const certificateButton = page.getByTitle(/ownership certificate/i);
  await expect(certificateButton).toBeEnabled();
  const [certificateDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 20_000 }),
    certificateButton.click(),
  ]);
  const certificatePath = path.join(
    DOWNLOAD_DIR,
    certificateDownload.suggestedFilename() || 'ownership-certificate.pdf',
  );
  await certificateDownload.saveAs(certificatePath);
  expect(fs.existsSync(certificatePath)).toBe(true);
  console.log(`✅ Ownership Certificate downloaded: PASSED (${certificatePath})`);

  await page.locator('a[href="/en/dashboard/my-portfolio"]:visible').first().click();
  await expect(page).toHaveURL(/\/en\/dashboard\/my-portfolio\/?(?:\?|$)/);
  console.log('✅ My Property Holdings page opened: PASSED');

  const cloud9Holding = page
    .locator('a[href*="/en/dashboard/my-portfolio/"]:visible')
    .filter({ hasText: /^cloud 9 \(inani\)$/i })
    .first();
  await expect(cloud9Holding).toBeVisible();
  await cloud9Holding.click();
  await expect(page).not.toHaveURL(/\/en\/dashboard\/my-portfolio\/?(?:\?|$)/, {
    timeout: 20_000,
  });
  console.log('✅ Cloud 9 holding details page opened: PASSED');
  console.log('✅ Holding details flow completed: PASSED');
});

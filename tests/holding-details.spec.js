const { test, expect } = require('@playwright/test');
const allure = require('allure-js-commons');
const fs = require('node:fs');
const path = require('node:path');
const { AuthPage } = require('../pages/AuthPage');
const { TransactionsPage, PaymentSuccessPage } = require('../pages/TransactionsPage');
const { PortfolioPage } = require('../pages/PortfolioPage');

const EMAIL = process.env.AUNGSHA_EMAIL;
const PASSWORD = process.env.AUNGSHA_PASSWORD;
const DOWNLOAD_DIR = path.resolve(__dirname, '..', 'downloads');

test.describe('Portfolio — Holding Details', () => {
  test('download holding documents and open property details', async ({ page }) => {
    test.setTimeout(120_000);
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

    await allure.epic('Aungsha Staging');
    await allure.feature('Holdings & Documents');
    await allure.story('Download invoice/certificate and open Cloud 9 holding details');
    await allure.severity('normal');
    await allure.owner('QA Automation');
    await allure.tags('holding', 'documents', 'portfolio', 'staging');
    await allure.description(
      'Opens latest paid transaction, downloads invoice and ownership certificate, then opens Cloud 9 holding details from My Portfolio.'
    );

    const auth = new AuthPage(page);
    const transactions = new TransactionsPage(page);
    const paymentSuccess = new PaymentSuccessPage(page);
    const portfolio = new PortfolioPage(page);

    await allure.step('1. Open sign-in page', async () => {
      await auth.openSignIn();
      console.log('✅ Sign-in page opened: PASSED');
    });

    await allure.step('2. Login with valid credentials', async () => {
      await auth.handleCookieConsent();
      await auth.fillCredentials(EMAIL, PASSWORD);
      await auth.submitLogin();
      console.log('✅ Login successful: PASSED');
    });

    await allure.step('3. Open latest paid transaction details', async () => {
      await transactions.open();
      await transactions.openLatestPaidTransaction();
      console.log('✅ Latest paid transaction details opened: PASSED');
    });

    await allure.step('4. Open paid purchase documents page', async () => {
      const { paymentId, reservationId } = await transactions.extractPaymentAndReservationIds();
      await allure.parameter('paymentId', String(paymentId));
      await allure.parameter('reservationId', String(reservationId));
      await paymentSuccess.openFromIds(reservationId, paymentId);
      console.log('✅ Paid purchase documents page opened: PASSED');
    });

    await allure.step('5. Download Invoice', async () => {
      const invoicePath = await paymentSuccess.downloadInvoice(DOWNLOAD_DIR);
      await allure.parameter('invoicePath', invoicePath);
      console.log(`✅ Invoice downloaded: PASSED (${invoicePath})`);
    });

    await allure.step('6. Download Ownership Certificate', async () => {
      const certificatePath = await paymentSuccess.downloadCertificate(DOWNLOAD_DIR);
      await allure.parameter('certificatePath', certificatePath);
      console.log(`✅ Ownership Certificate downloaded: PASSED (${certificatePath})`);
    });

    await allure.step('7. Open My Property Holdings', async () => {
      await page.locator('a[href="/en/dashboard/my-portfolio"]:visible').first().click();
      await expect(page).toHaveURL(/\/en\/dashboard\/my-portfolio\/?(?:\?|$)/);
      console.log('✅ My Property Holdings page opened: PASSED');
    });

    await allure.step('8. Open Cloud 9 holding details', async () => {
      const cloud9Holding = page
        .locator('a[href*="/en/dashboard/my-portfolio/"]:visible')
        .filter({ hasText: /^cloud 9 \(inani\)$/i })
        .first();
      await expect(cloud9Holding).toBeVisible();
      await cloud9Holding.click();
      await expect(page).not.toHaveURL(/\/en\/dashboard\/my-portfolio\/?(?:\?|$)/, { timeout: 20_000 });
      console.log('✅ Cloud 9 holding details page opened: PASSED');
      console.log('✅ Holding details flow completed: PASSED');
    });
  });
});

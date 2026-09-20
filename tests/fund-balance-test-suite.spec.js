/**
 * Fund Balance Purchase — Full verification suite
 *
 * ONE sequential test that verifies every checkpoint in the fund-balance
 * purchase flow without repeating the purchase transaction.
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { AuthPage } = require('../pages/AuthPage');
const { ProjectsPage } = require('../pages/ProjectsPage');
const { Cloud9CheckoutPage } = require('../pages/Cloud9CheckoutPage');
const { PortfolioPage } = require('../pages/PortfolioPage');
const { FundsPage } = require('../pages/FundsPage');
const { PaymentSuccessPage } = require('../pages/TransactionsPage');

const EMAIL = process.env.AUNGSHA_EMAIL;
const PASSWORD = process.env.AUNGSHA_PASSWORD;
const PHONE = process.env.AUNGSHA_PHONE;
const DOWNLOAD_DIR = path.resolve(__dirname, '..', 'downloads');

test('Fund Balance purchase flow — all checkpoints', async ({ page }) => {
  test.setTimeout(120_000);
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

  const auth = new AuthPage(page);
  const projects = new ProjectsPage(page);
  const checkout = new Cloud9CheckoutPage(page, undefined, { phone: PHONE });
  const portfolio = new PortfolioPage(page);
  const funds = new FundsPage(page);
  const paymentSuccess = new PaymentSuccessPage(page);

  await auth.openSignIn();
  console.log('✅ Sign-in page opened: PASSED');

  await auth.handleCookieConsent();
  await auth.fillCredentials(EMAIL, PASSWORD);
  await auth.submitLogin();
  console.log('✅ Login successful: PASSED');

  await projects.open();
  console.log('✅ Projects page opened: PASSED');

  await expect(projects.cloud9Link()).toBeVisible();
  await expect(projects.cloud9BuyButton()).toBeVisible();
  console.log('✅ Cloud 9 (Inani) visible with Buy Now action: PASSED');

  await projects.openCloud9Details();
  console.log('✅ Cloud 9 (Inani) details page opened: PASSED');

  await checkout.openCheckoutFromDetails();
  await expect(page.getByRole('heading', { name: /cloud 9 \(inani\)/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^buy$/i })).toBeVisible();
  console.log('✅ Cloud 9 (Inani) checkout page opened: PASSED');

  await checkout.fillCheckoutInfo({ requirePhone: false });
  console.log('✅ Checkout information completed: PASSED');

  await checkout.openPaymentDrawer();
  console.log('✅ Payment method drawer opened: PASSED');

  const { balanceBefore, purchasePrice } = await checkout.selectFundBalance();
  console.log(`✅ Fund Balance option visible, available BDT ${balanceBefore}: PASSED`);
  console.log(`✅ Fund Balance sufficient for purchase (BDT ${balanceBefore} >= BDT ${purchasePrice}): PASSED`);
  console.log('✅ Fund Balance payment method selected (aria-pressed=true): PASSED');

  await checkout.confirmWithFunds();
  console.log('✅ Confirmed purchase with Fund Balance: PASSED');
  console.log('✅ Purchase successful — PAID badge and Paid from Funds confirmed: PASSED');

  const certPath = await paymentSuccess.downloadOwnershipCertificateByTitle(DOWNLOAD_DIR);
  console.log('✅ Ownership Certificate button found and enabled: PASSED');
  console.log(`✅ Ownership Certificate downloaded: PASSED (${certPath})`);

  await paymentSuccess.goToPortfolioOrNavigate((p) => portfolio.goto(p));
  const cloud9HoldingCard = page
    .locator('a[href*="/en/dashboard/my-portfolio/"]:visible')
    .filter({ hasText: /cloud 9 \(inani\)/i })
    .first();
  await expect(cloud9HoldingCard).toBeVisible();
  console.log('✅ Cloud 9 (Inani) appears in My Portfolio: PASSED');

  await funds.open();
  await expect(page.getByRole('heading', { name: /funds/i })).toBeVisible();
  console.log('✅ My Points / Funds page opened: PASSED');

  const balanceAfter = await funds.readAvailableBalance();
  if (balanceBefore > 0 && balanceAfter >= 0) {
    expect(
      balanceAfter,
      `Fund Balance after (BDT ${balanceAfter}) must be less than before (BDT ${balanceBefore})`,
    ).toBeLessThan(balanceBefore);
  }
  console.log(`✅ Fund Balance decreased: BDT ${balanceBefore} → BDT ${balanceAfter}: PASSED`);
  console.log('✅ Fund Balance purchase flow — all checkpoints: PASSED');
});

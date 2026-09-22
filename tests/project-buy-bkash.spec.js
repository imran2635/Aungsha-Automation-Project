const { test, expect } = require('@playwright/test');
const allure = require('allure-js-commons');
const fs = require('node:fs');
const path = require('node:path');
const { AuthPage } = require('../pages/AuthPage');
const { ProjectsPage } = require('../pages/ProjectsPage');
const { Cloud9CheckoutPage } = require('../pages/Cloud9CheckoutPage');
const { PaymentSuccessPage } = require('../pages/TransactionsPage');

const EMAIL = process.env.AUNGSHA_EMAIL;
const PASSWORD = process.env.AUNGSHA_PASSWORD;
const PHONE = process.env.AUNGSHA_PHONE || process.env.BKASH_SANDBOX_PHONE || '01770618575';
const BKASH_PHONE = process.env.BKASH_SANDBOX_PHONE || '01770618575';
const BKASH_OTP = process.env.BKASH_SANDBOX_OTP || '123456';
const BKASH_PIN = process.env.BKASH_SANDBOX_PIN || '12121';
const DOWNLOAD_DIR = path.resolve(__dirname, '..', 'downloads');

test.describe('Purchase — Cloud 9 bKash Sandbox Buy Flow', () => {
  test('complete Cloud 9 buy via bKash sandbox and download documents', async ({ page }) => {
    test.setTimeout(180_000);
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

    await allure.epic('Aungsha Staging');
    await allure.feature('Project Purchase');
    await allure.story('Buy Cloud 9 via bKash sandbox');
    await allure.severity('critical');
    await allure.owner('QA Automation');
    await allure.tags('buy', 'bkash', 'cloud9', 'staging', 'documents');
    await allure.description(
      'Full Cloud 9 buy flow: login → project details → checkout → Pay with bKash → sandbox phone/OTP/PIN → download invoice + ownership certificate.'
    );
    await allure.parameter('bkashPhone', BKASH_PHONE);

    const auth = new AuthPage(page);
    const projects = new ProjectsPage(page);
    const checkout = new Cloud9CheckoutPage(page, undefined, {
      phone: PHONE,
      bkashPhone: BKASH_PHONE,
      bkashOtp: BKASH_OTP,
      bkashPin: BKASH_PIN,
    });
    const paymentSuccess = new PaymentSuccessPage(page);

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

    await allure.step('3. Open Projects page', async () => {
      await projects.open();
      console.log('✅ Projects page opened: PASSED');
    });

    await allure.step('4. Open Cloud 9 details', async () => {
      await projects.openCloud9Details();
      console.log('✅ Cloud 9 details page opened: PASSED');
    });

    await allure.step('5. Open checkout page', async () => {
      await checkout.openCheckoutFromDetails();
      console.log('✅ Checkout page opened: PASSED');
    });

    await allure.step('6. Complete checkout information', async () => {
      await checkout.fillCheckoutInfo();
      console.log('✅ Checkout information completed: PASSED');
    });

    await allure.step('7. Open payment method drawer', async () => {
      await checkout.openPaymentDrawer();
      console.log('✅ Payment method drawer opened: PASSED');
    });

    await allure.step('8. Select Pay with bKash', async () => {
      await checkout.selectBkashPayment();
      console.log('✅ Pay with bKash selected: PASSED');
    });

    await allure.step('9–11. Complete bKash sandbox payment', async () => {
      await checkout.completeBkashSandbox({
        expectSuccessUrl: /staging\.aungsha\.com\/en\/payment\/success/i,
      });
      console.log('✅ bKash Sandbox opened: PASSED');
      console.log('✅ bKash sandbox payment successful: PASSED');
      await expect(page.getByText(/purchase successful|paid/i).first()).toBeVisible({
        timeout: 20_000,
      });
      console.log('✅ Purchase success page opened: PASSED');
    });

    await allure.step('12. Download Invoice', async () => {
      const invoicePath = await paymentSuccess.downloadInvoice(DOWNLOAD_DIR);
      await allure.parameter('invoicePath', invoicePath);
      console.log(`✅ Invoice downloaded: PASSED (${invoicePath})`);
    });

    await allure.step('13. Download Ownership Certificate', async () => {
      const certificatePath = await paymentSuccess.downloadCertificate(DOWNLOAD_DIR);
      await allure.parameter('certificatePath', certificatePath);
      console.log(`✅ Ownership Certificate downloaded: PASSED (${certificatePath})`);
      console.log('✅ Full project buy via bKash flow completed: PASSED');
    });
  });
});

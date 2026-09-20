const { test } = require('@playwright/test');
const allure = require('allure-js-commons');
const { AuthPage } = require('../pages/AuthPage');
const { ProjectsPage } = require('../pages/ProjectsPage');
const { Cloud9CheckoutPage } = require('../pages/Cloud9CheckoutPage');

const EMAIL = process.env.AUNGSHA_EMAIL;
const PASSWORD = process.env.AUNGSHA_PASSWORD;
const PHONE = process.env.AUNGSHA_PHONE;
const SANDBOX_PIN = process.env.SHURJOPAY_PIN || '1234';

test.describe('Purchase — Cloud 9 Sandbox Buy Flow', () => {
  test('complete the Cloud 9 sandbox buy flow', async ({ page }) => {
    test.setTimeout(120_000);

    await allure.epic('Aungsha Staging');
    await allure.feature('Project Purchase');
    await allure.story('Buy Cloud 9 via ShurjoPay sandbox');
    await allure.severity('critical');
    await allure.owner('QA Automation');
    await allure.tags('buy', 'shurjopay', 'cloud9', 'staging');
    await allure.description(
      'Full Cloud 9 buy flow: login → project details → checkout → digital payment → ShurjoPay sandbox success.'
    );

    const auth = new AuthPage(page);
    const projects = new ProjectsPage(page);
    const checkout = new Cloud9CheckoutPage(page, undefined, { phone: PHONE, sandboxPin: SANDBOX_PIN });

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

    await allure.step('8. Select Make Digital Payment', async () => {
      const selected = await checkout.selectDigitalPayment();
      if (selected) console.log('✅ Make Digital Payment selected: PASSED');
    });

    await allure.step('9–11. Complete ShurjoPay sandbox payment', async () => {
      await checkout.completeShurjoPay();
      console.log('✅ ShurjoPay Sandbox opened: PASSED');
      console.log('✅ ShurjoPay sandbox payment successful: PASSED');
      console.log('✅ Full project buy flow completed: PASSED');
    });
  });
});

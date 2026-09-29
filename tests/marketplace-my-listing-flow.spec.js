const { test } = require('@playwright/test');
const allure = require('allure-js-commons');
const { AuthPage } = require('../pages/AuthPage');
const { ProjectsPage } = require('../pages/ProjectsPage');
const { Cloud9CheckoutPage } = require('../pages/Cloud9CheckoutPage');
const { PortfolioPage } = require('../pages/PortfolioPage');
const { ListingsPage } = require('../pages/ListingsPage');

const BASE_URL = 'https://staging.aungsha.com';
const EMAIL = process.env.AUNGSHA_EMAIL;
const PASSWORD = process.env.AUNGSHA_PASSWORD;
const PHONE = process.env.AUNGSHA_PHONE || '01929918378';
const SANDBOX_PIN = process.env.SHURJOPAY_PIN || '1234';
const ASKING_PRICE = process.env.MARKETPLACE_ASKING_PRICE || '2000';
const FORMATTED_ASKING_PRICE = Number(ASKING_PRICE).toLocaleString('en-US');

test.describe('Marketplace — My Listing Flow', () => {
  test('Buy Cloud 9 → portfolio → list at asking price → My Listings', async ({ page }) => {
    test.setTimeout(240_000);

    await allure.epic('Aungsha Staging');
    await allure.feature('Marketplace My Listing');
    await allure.story('Buy project, list on marketplace, open My Listings');
    await allure.severity('critical');
    await allure.owner('QA Automation');
    await allure.tags('marketplace', 'listing', 'sell-shares', 'cloud9', 'staging');
    await allure.description(
      'Buys Cloud 9 via ShurjoPay, opens My Portfolio → View Details → Go to marketplace, lists share at asking price, clicks Sell Shares, then opens My Listings.'
    );
    await allure.parameter('askingPrice', ASKING_PRICE);

    const auth = new AuthPage(page, BASE_URL);
    const projects = new ProjectsPage(page, BASE_URL);
    const checkout = new Cloud9CheckoutPage(page, BASE_URL, { phone: PHONE, sandboxPin: SANDBOX_PIN });
    const portfolio = new PortfolioPage(page, BASE_URL);
    const listings = new ListingsPage(page, BASE_URL);

    await allure.step('1. Login', async () => {
      await auth.openSignIn();
      await auth.handleCookieConsent();
      console.log('✅ 1. Cookie consent handled: PASSED');
      await auth.fillCredentials(EMAIL, PASSWORD);
      await auth.submitLogin();
      console.log('✅ 2. Login successful: PASSED');
    });

    await allure.step('2. Buy one Cloud 9 unit via ShurjoPay', async () => {
      await projects.open();
      await projects.openCloud9Details();
      console.log('✅ 3. Cloud 9 project details opened: PASSED');

      await checkout.openCheckoutFromDetails();
      console.log('✅ 4. Checkout page opened: PASSED');

      await checkout.fillCheckoutInfo();
      await checkout.openPaymentDrawer();
      await checkout.selectDigitalPayment();
      await checkout.completeShurjoPay();
      console.log('✅ 5. Cloud 9 unit purchased via ShurjoPay: PASSED');
    });

    await allure.step('3. My Portfolio → View Details', async () => {
      await portfolio.gotoWithRetry();
      console.log('✅ 6. My Portfolio opened: PASSED');
      await portfolio.openCloud9Details();
      console.log('✅ 7. View Details clicked — Cloud 9 holding opened: PASSED');
    });

    await allure.step(`4. Go to marketplace → list at BDT ${ASKING_PRICE} → Sell Shares`, async () => {
      await portfolio.selectMarketplaceAndList(ASKING_PRICE);
      console.log('✅ 8. Go to marketplace selected: PASSED');
      console.log(`✅ 9. Asking price filled (BDT ${ASKING_PRICE}): PASSED`);
      console.log('✅ 10. Sell Shares clicked — listing created: PASSED');
    });

    await allure.step('5. My Listings', async () => {
      await listings.openFromSuccessModalOrNav();
      await listings.expectActiveListing('Cloud 9 \\(Inani\\)', FORMATTED_ASKING_PRICE);
      console.log('✅ 11. My Listings opened: PASSED');
      console.log(`✅ 12. Active listing visible at BDT ${FORMATTED_ASKING_PRICE}: PASSED`);
    });

    console.log('\n🎉 Marketplace My Listing flow — all checkpoints: PASSED');
  });
});

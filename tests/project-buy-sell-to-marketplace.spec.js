const { test, expect } = require('@playwright/test');
const allure = require('allure-js-commons');
const { AuthPage } = require('../pages/AuthPage');
const { ProjectsPage } = require('../pages/ProjectsPage');
const { Cloud9CheckoutPage } = require('../pages/Cloud9CheckoutPage');
const { PortfolioPage } = require('../pages/PortfolioPage');
const { MarketplacePage } = require('../pages/MarketplacePage');
const { ListingsPage } = require('../pages/ListingsPage');

const EMAIL = process.env.AUNGSHA_EMAIL;
const PASSWORD = process.env.AUNGSHA_PASSWORD;
const PHONE = process.env.AUNGSHA_PHONE;
const SANDBOX_PIN = process.env.SHURJOPAY_PIN || '1234';
const ASKING_PRICE = process.env.MARKETPLACE_ASKING_PRICE || '1500';
const FORMATTED_ASKING_PRICE = Number(ASKING_PRICE).toLocaleString('en-US');
const RESUME_AFTER_PURCHASE = process.env.MARKETPLACE_RESUME_AFTER_PURCHASE === 'true';

test.describe('Sell — Buy then List on Marketplace', () => {
  test('Project buy sell to market place', async ({ page }) => {
    test.setTimeout(240_000);

    await allure.epic('Aungsha Staging');
    await allure.feature('Marketplace Listing');
    await allure.story('Buy Cloud 9 then list for resale on Marketplace');
    await allure.severity('critical');
    await allure.owner('QA Automation');
    await allure.tags('marketplace', 'sell', 'listing', 'cloud9', 'staging');
    await allure.description(
      'Purchases Cloud 9 (or resumes after purchase), lists unit on Marketplace at asking price, and verifies listing in My Listings and Marketplace.'
    );
    await allure.parameter('askingPrice', ASKING_PRICE);
    await allure.parameter('resumeAfterPurchase', String(RESUME_AFTER_PURCHASE));

    const auth = new AuthPage(page);
    const projects = new ProjectsPage(page);
    const checkout = new Cloud9CheckoutPage(page, undefined, { phone: PHONE, sandboxPin: SANDBOX_PIN });
    const portfolio = new PortfolioPage(page);
    const marketplace = new MarketplacePage(page);
    const listings = new ListingsPage(page);

    await allure.step('Login', async () => {
      await auth.openSignIn();
      await auth.handleCookieConsent();
      console.log('[PASSED] Cookie consent handled');
      await auth.fillCredentials(EMAIL, PASSWORD);
      await auth.submitLogin();
      console.log('[PASSED] Login successful');
    });

    if (!RESUME_AFTER_PURCHASE) {
      await allure.step('Buy one Cloud 9 unit via ShurjoPay', async () => {
        await projects.open();
        await projects.openCloud9Details();
        console.log('[PASSED] Cloud 9 project details opened');

        await checkout.openCheckoutFromDetails();
        console.log('[PASSED] Checkout page opened');

        await checkout.fillCheckoutInfo();
        console.log('[PASSED] Checkout information completed');

        await checkout.openPaymentDrawer();
        await checkout.selectDigitalPayment();
        await checkout.completeShurjoPay();
        console.log('[PASSED] ShurjoPay sandbox opened');
        console.log('[PASSED] One Cloud 9 unit purchased');
      });
    } else {
      await allure.step('Reuse existing purchased unit (skip buy)', async () => {
        console.log('[PASSED] Existing purchased unit reused; duplicate purchase skipped');
      });
    }

    await allure.step('Open Cloud 9 portfolio details', async () => {
      await portfolio.gotoWithRetry();
      await portfolio.openCloud9Details();
      console.log('[PASSED] Cloud 9 portfolio details opened');
    });

    await allure.step(`Create marketplace resale offer at BDT ${ASKING_PRICE}`, async () => {
      await portfolio.selectMarketplaceAndList(ASKING_PRICE);
      console.log('[PASSED] Go to marketplace selected');
      console.log('[PASSED] Newly purchased one-unit reservation selected');
      console.log(`[PASSED] Marketplace resale offer created at BDT ${ASKING_PRICE}`);
    });

    await allure.step('Verify active listing in dashboard My Listings', async () => {
      await listings.openFromSuccessModalOrNav();
      await listings.expectActiveListing('Cloud 9 \\(Inani\\)', FORMATTED_ASKING_PRICE);
      console.log('[PASSED] Listing is active in dashboard My Listings');
    });

    await allure.step('Open Home then Marketplace My Listings', async () => {
      await listings.goHome();
      console.log('[PASSED] Home opened from dashboard My Listings');

      await marketplace.open();
      console.log('[PASSED] Marketplace opened from Home');

      await marketplace.openMyListingsTab();
      console.log('[PASSED] Marketplace My Listings selected');
    });

    await allure.step('Verify listing visible in Marketplace My Listings', async () => {
      const marketplaceListing = marketplace.listingCard(/Cloud 9 \(Inani\)/i, new RegExp(FORMATTED_ASKING_PRICE));
      await expect(marketplaceListing).toBeVisible();
      await expect(marketplaceListing.getByText(/Imran Bponi/i).last()).toBeVisible();
      await expect(marketplaceListing.getByRole('button', { name: /^cancel sell$/i })).toBeVisible();
      console.log('[PASSED] Listing is visible in Marketplace My Listings');
    });

    await allure.step('Open final Cloud 9 portfolio details', async () => {
      await listings.openDashboardPortfolio();
      await portfolio.openCloud9Details();
      await expect(page.getByText(/portfolio details/i).first()).toBeVisible();
      await expect(page.getByText(/how would you like to sell\?/i)).toBeVisible();
      console.log('[PASSED] Final Cloud 9 portfolio details page opened');
    });
  });
});

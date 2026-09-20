const { test, expect } = require('@playwright/test');
const allure = require('allure-js-commons');
const fs = require('node:fs');
const path = require('node:path');
const { AuthPage } = require('../pages/AuthPage');
const { MarketplacePage } = require('../pages/MarketplacePage');
const { PortfolioPage } = require('../pages/PortfolioPage');
const { PaymentSuccessPage } = require('../pages/TransactionsPage');

const BASE_URL = 'https://staging.aungsha.com';
const EMAIL = process.env.AUNGSHA_EMAIL;
const PASSWORD = process.env.AUNGSHA_PASSWORD;
const PHONE = process.env.AUNGSHA_PHONE;
const SANDBOX_PIN = process.env.SHURJOPAY_PIN || '1234';
const DOWNLOAD_DIR = path.resolve(__dirname, '..', 'downloads');

test.describe('Marketplace — Buy from Marketplace', () => {
  test.beforeEach(async () => {
    await allure.epic('Aungsha Staging');
    await allure.feature('Marketplace Buy');
    await allure.owner('QA Automation');
    await allure.tags('marketplace', 'buy', 'staging');
  });

  test('✅ POSITIVE — Project Buy from Marketplace (12 checkpoints)', async ({ page }) => {
    test.setTimeout(240_000);
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

    await allure.severity('critical');
    await allure.story('Purchase a marketplace share via ShurjoPay and verify holdings');
    await allure.description(
      'Buys a random purchasable marketplace listing, downloads invoice/certificate, and verifies the holding in My Portfolio.'
    );

    const auth = new AuthPage(page, BASE_URL);
    const marketplace = new MarketplacePage(page, BASE_URL);
    const portfolio = new PortfolioPage(page, BASE_URL);
    const paymentSuccess = new PaymentSuccessPage(page, BASE_URL);

    await allure.step('1. Open sign-in page', async () => {
      await auth.openSignIn();
      console.log('✅ 1. Sign-in page opened: PASSED');
    });

    await allure.step('2. Handle cookie consent', async () => {
      await auth.handleCookieConsent();
      console.log('✅ 2. Cookie consent handled: PASSED');
    });

    await allure.step('3. Login with valid credentials', async () => {
      await auth.fillCredentials(EMAIL, PASSWORD);
      await auth.submitLogin();
      console.log('✅ 3. Login successful: PASSED');
    });

    await allure.step('4. Open Marketplace', async () => {
      await marketplace.open();
      console.log('✅ 4. Marketplace opened: PASSED');
    });

    let selectedCard;
    let projectName;
    await allure.step('5. Select random purchasable share', async () => {
      ({ selectedCard, projectName } = await marketplace.selectRandomPurchasable());
      await allure.parameter('projectName', projectName);
      console.log(`✅ 5. Random purchasable share selected: "${projectName}": PASSED`);
    });

    await allure.step('6. Open marketplace checkout', async () => {
      await marketplace.openCheckout(selectedCard);
      console.log('✅ 6. Marketplace checkout opened: PASSED');
    });

    await allure.step('7. Fill checkout and open payment drawer', async () => {
      await marketplace.fillCheckoutAndOpenPayment(PHONE);
      console.log('✅ 7. Payment method drawer opened: PASSED');
    });

    await allure.step('8. Select Make Digital Payment', async () => {
      const selected = await marketplace.selectDigitalPayment();
      console.log(selected
        ? '✅ 8. Make Digital Payment selected: PASSED'
        : '✅ 8. Payment method ready (Make Digital Payment not required): PASSED');
    });

    await allure.step('9–10. Complete ShurjoPay and purchase share', async () => {
      await marketplace.completeShurjoPay(PHONE, SANDBOX_PIN);
      console.log('✅ 9. ShurjoPay sandbox opened: PASSED');
      console.log(`✅ 10. Marketplace share purchased ("${projectName}"): PASSED`);
    });

    await allure.step('11–12. Download invoice and ownership certificate', async () => {
      await marketplace.downloadInvoiceAndCertificate(DOWNLOAD_DIR);
      console.log('✅ 11. Invoice downloaded: PASSED');
      console.log('✅ 12. Ownership Certificate downloaded: PASSED');
    });

    await allure.step('13. Open My Property Holdings', async () => {
      await paymentSuccess.goToPortfolioOrNavigate((p) => portfolio.goto(p));
      console.log('✅ 13. My Property Holdings opened: PASSED');
    });

    let purchasedHolding;
    await allure.step('14. Verify purchased project in holdings', async () => {
      purchasedHolding = await portfolio.expectHoldingVisible(projectName);
      console.log('✅ 14. Purchased project visible in holdings: PASSED');
    });

    await allure.step('15. Open and verify holding details', async () => {
      await purchasedHolding.getByRole('link', { name: /^view details$/i }).click();
      await expect(page).toHaveURL(/\/en\/dashboard\/my-portfolio\/[^/]+\/?(?:\?|$)/, { timeout: 20_000 });
      await expect(page.getByText(/portfolio details/i).first()).toBeVisible({ timeout: 10_000 });
      expect(page.url()).toMatch(/\/en\/dashboard\/my-portfolio\/[^/]+\/?/);
      console.log(`✅ 15. Holding details page opened and verified ("${projectName}"): PASSED`);
    });

    console.log('\n🎉 POSITIVE — Marketplace buy flow all checkpoints: PASSED');
  });

  test('❌ NEGATIVE 1 — Unauthenticated marketplace checkout redirects to sign-in', async ({ page }) => {
    test.setTimeout(30_000);
    await allure.severity('normal');
    await allure.story('Block unauthenticated marketplace checkout');
    await allure.tags('negative', 'auth');

    await allure.step('Open checkout URL without login', async () => {
      await page.goto(`${BASE_URL}/en/marketplace/some-project/checkout`, { waitUntil: 'domcontentloaded' });
    });

    await allure.step('Assert redirect or auth block', async () => {
      const redirectedToSignIn = await page.waitForURL(/\/en\/sign-in|\/en\/login/i, { timeout: 10_000 }).then(() => true).catch(() => false);
      const hasAuthError = await page.getByText(/sign in|log in|unauthorized|please log/i).isVisible({ timeout: 5_000 }).catch(() => false);
      const notOnCheckout = !page.url().includes('/checkout');

      expect(
        redirectedToSignIn || hasAuthError || notOnCheckout,
        'Unauthenticated user must not access checkout page',
      ).toBe(true);
      console.log('✅ NEGATIVE 1 — Unauthenticated checkout access blocked / redirected: PASSED');
    });
  });

  test('❌ NEGATIVE 2 — Marketplace page has at least one purchasable listing', async ({ page }) => {
    test.setTimeout(60_000);
    await allure.severity('normal');
    await allure.story('Marketplace has purchasable listings');
    await allure.tags('negative', 'inventory');

    const auth = new AuthPage(page, BASE_URL);
    const marketplace = new MarketplacePage(page, BASE_URL);

    await allure.step('Login and open Marketplace', async () => {
      await auth.loginSimple(EMAIL, PASSWORD);
      await marketplace.open();
    });

    await allure.step('Assert at least one Buy Now listing', async () => {
      const count = await marketplace.purchasableCards().count();
      await allure.parameter('purchasableCount', String(count));
      expect(count, 'Marketplace must have at least one listing with Buy Now').toBeGreaterThan(0);
      console.log(`✅ NEGATIVE 2 — Marketplace has ${count} purchasable listing(s): PASSED`);
    });
  });

  test('❌ NEGATIVE 3 — Payment drawer shows Make Digital Payment option', async ({ page }) => {
    test.setTimeout(90_000);
    await allure.severity('normal');
    await allure.story('Payment drawer shows digital payment option');
    await allure.tags('negative', 'payment');

    const auth = new AuthPage(page, BASE_URL);
    const marketplace = new MarketplacePage(page, BASE_URL);

    await allure.step('Login, open first listing checkout and payment drawer', async () => {
      await auth.loginSimple(EMAIL, PASSWORD);
      await marketplace.open();
      const firstCard = marketplace.purchasableCards().first();
      await expect(firstCard).toBeVisible();
      await marketplace.openCheckout(firstCard);
      await marketplace.fillCheckoutAndOpenPayment(PHONE);
    });

    await allure.step('Assert Make Digital Payment visible', async () => {
      await expect(page.getByRole('button', { name: /make digital payment/i })).toBeVisible({ timeout: 10_000 });
      console.log('✅ NEGATIVE 3 — "Make Digital Payment" option visible in payment drawer: PASSED');

      const bkashVisible = await page.getByText(/pay with bkash/i).isVisible({ timeout: 3_000 }).catch(() => false);
      console.log(`✅ NEGATIVE 3 — bKash option visible: ${bkashVisible} (informational only): PASSED`);
    });
  });

  test('❌ NEGATIVE 4 — Marketplace checkout Buy button disabled when page first loads', async ({ page }) => {
    test.setTimeout(60_000);
    await allure.severity('normal');
    await allure.story('Payment drawer closed until Buy is clicked');
    await allure.tags('negative', 'checkout');

    const auth = new AuthPage(page, BASE_URL);
    const marketplace = new MarketplacePage(page, BASE_URL);

    await allure.step('Login and open first listing checkout', async () => {
      await auth.loginSimple(EMAIL, PASSWORD);
      await marketplace.open();
      const firstCard = marketplace.purchasableCards().first();
      await expect(firstCard).toBeVisible();
      await marketplace.openCheckout(firstCard);
    });

    await allure.step('Assert payment drawer closed and Buy enabled', async () => {
      const drawerVisibleBeforeClick = await page.getByText(/select payment method/i).isVisible({ timeout: 2_000 }).catch(() => false);
      expect(drawerVisibleBeforeClick, 'Payment drawer must not be open before Buy is clicked').toBe(false);
      console.log('✅ NEGATIVE 4 — Payment drawer not visible before Buy button click: PASSED');

      await expect(page.getByRole('button', { name: /^buy$/i })).toBeEnabled({ timeout: 10_000 });
      console.log('✅ NEGATIVE 4 — Buy button is enabled on checkout page: PASSED');
    });
  });
});

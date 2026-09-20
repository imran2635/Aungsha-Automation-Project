const { test, expect } = require('@playwright/test');
const allure = require('allure-js-commons');
const { AuthPage } = require('../pages/AuthPage');
const { ProjectsPage } = require('../pages/ProjectsPage');
const { Cloud9CheckoutPage } = require('../pages/Cloud9CheckoutPage');
const { PortfolioPage } = require('../pages/PortfolioPage');
const { FundsPage } = require('../pages/FundsPage');

const BASE_URL = 'https://staging.aungsha.com';
const EMAIL = process.env.AUNGSHA_EMAIL;
const PASSWORD = process.env.AUNGSHA_PASSWORD;
const PHONE = process.env.AUNGSHA_PHONE;
const SANDBOX_PIN = process.env.SHURJOPAY_PIN || '1234';

test.describe('Sell — Buy then Sell to Aungsha', () => {
  test.beforeEach(async () => {
    await allure.epic('Aungsha Staging');
    await allure.feature('Sell to Aungsha');
    await allure.owner('QA Automation');
    await allure.tags('sell', 'aungsha', 'cloud9', 'staging');
  });

  test('✅ POSITIVE — Project buy and sell to Aungsha (16 checkpoints)', async ({ page }) => {
    test.setTimeout(240_000);

    await allure.severity('critical');
    await allure.story('Buy Cloud 9 then sell unit back to Aungsha');
    await allure.description(
      'Purchases one Cloud 9 unit via ShurjoPay, sells it to Aungsha from portfolio, and verifies Funds wallet transaction.'
    );

    const auth = new AuthPage(page, BASE_URL);
    const projects = new ProjectsPage(page, BASE_URL);
    const checkout = new Cloud9CheckoutPage(page, BASE_URL, { phone: PHONE, sandboxPin: SANDBOX_PIN });
    const portfolio = new PortfolioPage(page, BASE_URL);
    const funds = new FundsPage(page, BASE_URL);

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

    await allure.step('4. Open Cloud 9 project details', async () => {
      await projects.open();
      await projects.openCloud9Details();
      console.log('✅ 4. Cloud 9 project details opened: PASSED');
    });

    await allure.step('5. Open checkout page', async () => {
      await checkout.openCheckoutFromDetails();
      console.log('✅ 5. Checkout page opened: PASSED');
    });

    await allure.step('6. Complete checkout information', async () => {
      await checkout.fillCheckoutInfo({ requirePhone: false });
      console.log('✅ 6. Checkout information completed: PASSED');
    });

    await allure.step('7. Open payment method drawer', async () => {
      await checkout.openPaymentDrawer();
      console.log('✅ 7. Payment method drawer opened: PASSED');
    });

    await allure.step('8. Select Make Digital Payment', async () => {
      await checkout.selectDigitalPayment();
      console.log('✅ 8. Make Digital Payment selected: PASSED');
    });

    await allure.step('9–10. Complete ShurjoPay and purchase unit', async () => {
      await checkout.completeShurjoPay();
      console.log('✅ 9. ShurjoPay sandbox opened: PASSED');
      console.log('✅ 10. One Cloud 9 unit purchased: PASSED');
    });

    await allure.step('11. Open My Portfolio — Cloud 9 visible', async () => {
      await portfolio.open();
      await expect(portfolio.cloud9Card()).toBeVisible();
      console.log('✅ 11. My Portfolio opened — Cloud 9 card visible: PASSED');
    });

    await allure.step('12. Open Cloud 9 holding details', async () => {
      await portfolio.openCloud9Details();
      console.log('✅ 12. Cloud 9 holding details page opened: PASSED');
    });

    await allure.step('13. Select Sell to Aungsha', async () => {
      await portfolio.selectSellToAungsha();
      console.log('✅ 13. Sell to Aungsha option selected (checkbox checked): PASSED');
    });

    await allure.step('14. Confirm sell to Aungsha', async () => {
      const sellSharesBtn = portfolio.sellSharesButton();
      await expect(sellSharesBtn).toBeEnabled();
      await sellSharesBtn.click();
      await expect(page.getByText(/your shares have been sold to Aungsha/i)).toBeVisible({ timeout: 20_000 });
      console.log('✅ 14. One Cloud 9 unit sold to Aungsha — confirmation visible: PASSED');
    });

    await allure.step('15. Verify Funds wallet transaction', async () => {
      await portfolio.goToFundsFromSuccess();
      await funds.expectFundsHeading();
      await funds.expectWalletTransaction();
      console.log('✅ 15. Funds page verified — wallet transaction visible: PASSED');
    });

    await allure.step('16. Re-open Cloud 9 portfolio details with sell options', async () => {
      await portfolio.open();
      await portfolio.openCloud9Details();
      await expect(page.getByText(/how would you like to sell\?/i)).toBeVisible();
      console.log('✅ 16. Cloud 9 portfolio details page opened with sell options: PASSED');
    });

    console.log('\n🎉 POSITIVE — Buy → Sell to Aungsha all 16 checkpoints: PASSED');
  });

  test('❌ NEGATIVE 1 — Unauthenticated My Portfolio access redirects to sign-in', async ({ page }) => {
    test.setTimeout(30_000);
    await allure.severity('normal');
    await allure.story('Block unauthenticated My Portfolio access');
    await allure.tags('negative', 'auth');

    const portfolio = new PortfolioPage(page, BASE_URL);

    await allure.step('Open My Portfolio without login', async () => {
      await portfolio.open();
    });

    await allure.step('Assert redirect or auth prompt', async () => {
      const redirected = await page.waitForURL(/\/en\/sign-in|\/en\/login/i, { timeout: 10_000 }).then(() => true).catch(() => false);
      const hasAuthPrompt = await page.getByText(/sign in|log in|unauthorized/i).isVisible({ timeout: 5_000 }).catch(() => false);

      expect(
        redirected || hasAuthPrompt || !page.url().includes('/my-portfolio'),
        'Unauthenticated user must not access My Portfolio',
      ).toBe(true);
      console.log('✅ NEGATIVE 1 — Unauthenticated My Portfolio access blocked: PASSED');
    });
  });

  test('❌ NEGATIVE 2 — Cloud 9 project is visible in the Projects list', async ({ page }) => {
    test.setTimeout(60_000);
    await allure.severity('normal');
    await allure.story('Cloud 9 visible in Projects list');
    await allure.tags('negative', 'projects');

    const auth = new AuthPage(page, BASE_URL);
    const projects = new ProjectsPage(page, BASE_URL);

    await allure.step('Login and open Projects', async () => {
      await auth.loginSimple(EMAIL, PASSWORD);
      await projects.open();
    });

    await allure.step('Assert Cloud 9 card and Buy button', async () => {
      await expect(projects.cloud9Link()).toBeVisible();
      console.log('✅ NEGATIVE 2 — Cloud 9 (Inani) visible in Projects list: PASSED');
      await expect(projects.cloud9BuyButton()).toBeVisible();
      console.log('✅ NEGATIVE 2 — Cloud 9 Buy/Prebook Now button visible on card: PASSED');
    });
  });

  test('❌ NEGATIVE 3 — Sell to Aungsha requires checkbox confirmation before Sell button enabled', async ({ page }) => {
    test.setTimeout(90_000);
    await allure.severity('normal');
    await allure.story('Sell Shares disabled until sell option selected');
    await allure.tags('negative', 'validation');

    const auth = new AuthPage(page, BASE_URL);
    const portfolio = new PortfolioPage(page, BASE_URL);

    await allure.step('Login and open Cloud 9 holding details', async () => {
      await auth.loginSimple(EMAIL, PASSWORD);
      await portfolio.open();
      await portfolio.openCloud9Details();
    });

    await allure.step('Assert Sell disabled then enabled after Sell to Aungsha', async () => {
      const sellSharesBtn = portfolio.sellSharesButton();
      const isSellEnabled = await sellSharesBtn.isEnabled({ timeout: 3_000 }).catch(() => false);
      expect(isSellEnabled, 'Sell Shares button must not be enabled before selecting a sell option').toBe(false);
      console.log('✅ NEGATIVE 3 — Sell Shares button disabled before selecting sell option: PASSED');

      await portfolio.selectSellToAungsha();
      await expect(sellSharesBtn).toBeEnabled({ timeout: 5_000 });
      console.log('✅ NEGATIVE 3 — Sell Shares button enabled after Sell to Aungsha selected: PASSED');
    });
  });

  test('❌ NEGATIVE 4 — Funds page shows wallet transactions after selling', async ({ page }) => {
    test.setTimeout(30_000);
    await allure.severity('normal');
    await allure.story('Funds page shows wallet transactions');
    await allure.tags('negative', 'funds');

    const auth = new AuthPage(page, BASE_URL);
    const funds = new FundsPage(page, BASE_URL);

    await allure.step('Login and open Funds', async () => {
      await auth.loginSimple(EMAIL, PASSWORD);
      await funds.open();
    });

    await allure.step('Assert Funds heading and wallet section', async () => {
      await funds.expectFundsHeading();
      await funds.expectWalletTransaction();
      console.log('✅ NEGATIVE 4 — Funds page accessible and wallet transaction section visible: PASSED');
    });
  });
});

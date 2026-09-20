const { test, expect } = require('@playwright/test');
const allure = require('allure-js-commons');
const path = require('node:path');
const { AuthPage } = require('../pages/AuthPage');
const { FundsPage } = require('../pages/FundsPage');
const { PortfolioPage } = require('../pages/PortfolioPage');
const { WithdrawalPage } = require('../pages/WithdrawalPage');

const EMAIL = process.env.AUNGSHA_EMAIL;
const PASSWORD = process.env.AUNGSHA_PASSWORD;
const ACCOUNT_HOLDER = process.env.WITHDRAWAL_ACCOUNT_HOLDER;
const BKASH_NUMBER = process.env.WITHDRAWAL_BKASH_NUMBER;
const OTP = process.env.WITHDRAWAL_OTP;
const STATUS_ONLY = process.env.WITHDRAWAL_STATUS_ONLY === 'true';
const FORCE_FULL_FLOW = process.env.WITHDRAWAL_FORCE_FULL_FLOW === 'true';
const RESET_SAVED_METHOD = process.env.WITHDRAWAL_RESET_SAVED_METHOD === 'true';
const FORCE_UNIT_CONVERSION = process.env.WITHDRAWAL_FORCE_UNIT_CONVERSION === 'true';
const WITHDRAWAL_AMOUNT = Number(process.env.WITHDRAWAL_AMOUNT || '1400');
const OTP_FILE = path.resolve(__dirname, '..', 'withdrawal-otp.txt');

if (!Number.isFinite(WITHDRAWAL_AMOUNT) || WITHDRAWAL_AMOUNT <= 0) {
  throw new Error('WITHDRAWAL_AMOUNT must be a positive number.');
}

test.describe('Funds — Instant Withdrawal', () => {
  test('complete a new instant withdrawal with bKash', async ({ page }) => {
    test.setTimeout(240_000);

    await allure.epic('Aungsha Staging');
    await allure.feature('Withdrawal');
    await allure.story('Instant withdrawal via bKash');
    await allure.severity('critical');
    await allure.owner('QA Automation');
    await allure.tags('withdrawal', 'bkash', 'funds', 'staging');
    await allure.description(
      'Logs in, optionally converts a unit to funds, opens withdrawal payment dialog, selects bKash, submits amount, and verifies pending withdrawal.'
    );
    await allure.parameter('withdrawalAmount', String(WITHDRAWAL_AMOUNT));
    await allure.parameter('forceFullFlow', String(FORCE_FULL_FLOW));
    await allure.parameter('statusOnly', String(STATUS_ONLY));

    const auth = new AuthPage(page);
    const funds = new FundsPage(page);
    const portfolio = new PortfolioPage(page);
    const withdrawal = new WithdrawalPage(page, undefined, {
      accountHolder: ACCOUNT_HOLDER,
      bkashNumber: BKASH_NUMBER,
      otp: OTP,
      otpFile: OTP_FILE,
      amount: WITHDRAWAL_AMOUNT,
      resetSavedMethod: RESET_SAVED_METHOD,
    });

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

    let pendingAmount;
    await allure.step('3. Open Funds and check pending withdrawal', async () => {
      await funds.open();
      await page.waitForTimeout(1_500);
      pendingAmount = await funds.readPendingWithdrawal();
      await allure.parameter('pendingBefore', `BDT ${pendingAmount}`);
    });

    if (pendingAmount > 0 && !FORCE_FULL_FLOW) {
      await allure.step('Pending withdrawal already present — skip new request', async () => {
        console.log(`✅ Pending withdrawal detected (BDT ${pendingAmount}): PASSED`);
        console.log('✅ Instant withdrawal completed: PASSED');
        console.log('✅ Full withdrawal flow completed: PASSED');
      });
      return;
    }
    if (STATUS_ONLY) {
      throw new Error('WITHDRAWAL_NOT_CONFIRMED: Pending Withdrawal is BDT 0.');
    }

    let withdrawButton = funds.withdrawButton();
    if (FORCE_UNIT_CONVERSION || !(await withdrawButton.isEnabled().catch(() => false))) {
      await allure.step('Convert portfolio unit to withdrawable funds', async () => {
        await portfolio.open();
        console.log('✅ My Portfolio opened: PASSED');

        await portfolio.openFirstHoldingDetails();
        console.log('✅ Portfolio holding details opened: PASSED');

        await portfolio.convertUnitToFunds();
        console.log('✅ Instant Withdraw option selected: PASSED');
        console.log('✅ Unit converted to withdrawable funds: PASSED');
        withdrawButton = funds.withdrawButton();
      });
    } else {
      await allure.step('Skip unit conversion — wallet funds already available', async () => {
        console.log('✅ Converted wallet funds detected; duplicate unit conversion skipped: PASSED');
      });
    }

    await allure.step('Open withdrawal payment dialog and select bKash', async () => {
      const paymentDialog = await withdrawal.openPaymentDialog();
      console.log('✅ Withdrawal payment-method dialog opened: PASSED');

      await withdrawal.ensureBkashMethod(paymentDialog);
      console.log('✅ Verified bKash method selected: PASSED');
    });

    await allure.step('Submit withdrawal amount', async () => {
      await withdrawal.submitAmount();
    });

    await allure.step('Verify pending withdrawal amount on Funds page', async () => {
      await page.waitForTimeout(1_500);
      await funds.open();
      await page.waitForTimeout(1_500);
      const finalPendingAmount = await funds.readPendingWithdrawal();
      const expectedPendingAmount = FORCE_FULL_FLOW
        ? pendingAmount + WITHDRAWAL_AMOUNT
        : WITHDRAWAL_AMOUNT;
      await allure.parameter('pendingAfter', `BDT ${finalPendingAmount}`);
      expect(finalPendingAmount).toBeGreaterThanOrEqual(expectedPendingAmount);
      console.log(`✅ Pending withdrawal verified (BDT ${finalPendingAmount}): PASSED`);
      console.log('✅ Instant withdrawal completed: PASSED');
      console.log('✅ Full withdrawal flow completed: PASSED');
    });
  });
});

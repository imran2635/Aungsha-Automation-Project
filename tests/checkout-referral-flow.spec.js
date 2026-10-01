/**
 * tests/checkout-referral-flow.spec.js
 *
 * Checkout Referral Code Flow (2 Chrome windows)
 *   Window 1 = Referrer (temp mail) → Referral Rewards → copy code
 *   Window 2 = Buyer (temp mail) → Cloud 9 checkout → Apply code → pay
 * Then assert ~5% reward for BOTH accounts.
 *
 * Run:
 *   npm.cmd run checkout-referral-shurjopay
 *   npm.cmd run checkout-referral-bkash
 */

'use strict';

const { test, expect } = require('@playwright/test');
const allure = require('allure-js-commons');
const { AuthPage } = require('../pages/AuthPage');
const { SignUpPage } = require('../pages/SignUpPage');
const { VerificationPage } = require('../pages/VerificationPage');
const { ProjectsPage } = require('../pages/ProjectsPage');
const { Cloud9CheckoutPage } = require('../pages/Cloud9CheckoutPage');
const { ReferralRewardsPage } = require('../pages/ReferralRewardsPage');
const { FundsPage } = require('../pages/FundsPage');
const { MailTmClient } = require('../services/MailTmClient');

const BASE_URL = 'https://staging.aungsha.com';
const PASSWORD = process.env.SIGNUP_PASSWORD || process.env.REFERRED_PASSWORD || 'Test@12345678';
const PHONE = process.env.AUNGSHA_PHONE || '01929918378';
const SANDBOX_PIN = process.env.SHURJOPAY_PIN || '1234';
const BKASH_PHONE = process.env.BKASH_SANDBOX_PHONE || '01929918378';
const BKASH_OTP = process.env.BKASH_SANDBOX_OTP || '123456';
const BKASH_PIN = process.env.BKASH_SANDBOX_PIN || '12121';
const COMMISSION_RATE = Number(process.env.REFERRAL_COMMISSION_RATE || '0.05');

function createCheckout(page) {
  return new Cloud9CheckoutPage(page, BASE_URL, {
    phone: PHONE,
    sandboxPin: SANDBOX_PIN,
    bkashPhone: BKASH_PHONE,
    bkashOtp: BKASH_OTP,
    bkashPin: BKASH_PIN,
  });
}

function createCheckpointTracker() {
  const results = { passed: 0, failed: 0, steps: [] };

  async function checkpoint(name, fn) {
    try {
      await fn();
      results.passed += 1;
      results.steps.push({ name, status: 'PASSED' });
      console.log(`✅ ${name}: PASSED`);
    } catch (error) {
      results.failed += 1;
      results.steps.push({ name, status: 'FAILED', error: error.message || String(error) });
      console.log(`❌ ${name}: FAILED — ${error.message || error}`);
      throw error;
    }
  }

  function printSummary(extra = {}) {
    const total = results.passed + results.failed;
    console.log('\n========== CHECKOUT REFERRAL SUMMARY ==========');
    console.log(`Passed : ${results.passed}`);
    console.log(`Failed : ${results.failed}`);
    console.log(`Total  : ${total}`);
    if (extra.paymentMethod) console.log(`Payment: ${extra.paymentMethod}`);
    if (extra.referrerEmail) console.log(`Referrer: ${extra.referrerEmail}`);
    if (extra.buyerEmail) console.log(`Buyer   : ${extra.buyerEmail}`);
    if (extra.referralCode) console.log(`Code    : ${extra.referralCode}`);
    if (extra.purchaseAmount != null) console.log(`Purchase: BDT ${extra.purchaseAmount}`);
    if (extra.expectedReward != null) console.log(`5% each : BDT ${extra.expectedReward}`);
    for (const step of results.steps) {
      const mark = step.status === 'PASSED' ? '✅' : '❌';
      console.log(`  ${mark} ${step.name}`);
    }
    console.log('===============================================\n');
  }

  return { checkpoint, printSummary, results };
}

async function signupAndVerify(page, request, profile) {
  const mailClient = new MailTmClient(request);
  const mailbox = await mailClient.createTempMailbox();
  const email = mailbox.address;

  const signUp = new SignUpPage(page, BASE_URL, profile);
  const verification = new VerificationPage(page, BASE_URL);
  const auth = new AuthPage(page, BASE_URL);

  await signUp.open();
  await signUp.createAccountWithEmail(email, profile.password);
  const verificationData = await mailClient.waitForVerificationMail(mailbox, page);
  if (!(await signUp.isVerificationVisible())) {
    await auth.login(email, profile.password);
  }
  await verification.complete(verificationData);
  await auth.login(email, profile.password);
  return { email, mailbox };
}

async function runCheckoutReferralFlow({ page, browser, request }, paymentMethod) {
  test.setTimeout(900_000);

  // Close default fixture page — we drive exactly 2 Chrome windows.
  await page.close().catch(() => {});

  await allure.epic('Aungsha Staging');
  await allure.feature('Checkout Referral Code');
  await allure.story(`2 browsers: referrer + buyer; checkout referral via ${paymentMethod}; both ~5%`);
  await allure.severity('critical');
  await allure.owner('QA Automation');
  await allure.tags('referral', 'checkout', paymentMethod, 'staging');
  await allure.parameter('paymentMethod', paymentMethod);
  await allure.parameter('commissionRate', String(COMMISSION_RATE));

  const { checkpoint, printSummary, results } = createCheckpointTracker();

  let referrerEmail;
  let buyerEmail;
  let referralCode;
  let referrerBefore;
  let buyerBefore;
  let buyerFundsBefore = 0;
  let purchaseAmount;
  let expectedReward;
  let buyerRewardError = null;

  // —— Open 2 Chrome windows at once (referrer + buyer) ——
  const referrerContext = await browser.newContext();
  const buyerContext = await browser.newContext();
  referrerContext.setDefaultTimeout(20_000);
  buyerContext.setDefaultTimeout(20_000);
  const referrerPage = await referrerContext.newPage();
  const buyerPage = await buyerContext.newPage();
  referrerPage.setDefaultNavigationTimeout(45_000);
  buyerPage.setDefaultNavigationTimeout(45_000);

  console.log('🪟 Two Chrome windows opened: Window-1=Referrer, Window-2=Buyer');

  try {
    await allure.step('1. Window-1 — create referrer account', async () => {
      await checkpoint('1. Referrer account created (Window-1)', async () => {
        await referrerPage.bringToFront();
        ({ email: referrerEmail } = await signupAndVerify(referrerPage, request, {
          firstName: 'Referrer',
          lastName: 'Ali',
          password: PASSWORD,
        }));
        await allure.parameter('referrerEmail', referrerEmail);
        console.log(`   Window-1 email=${referrerEmail}`);
      });
    });

    await allure.step('2. Window-1 — capture referral code', async () => {
      await checkpoint('2. Referral code captured (Window-1)', async () => {
        await referrerPage.bringToFront();
        const referralRewards = new ReferralRewardsPage(referrerPage, BASE_URL);
        await referralRewards.open();
        referrerBefore = await referralRewards.readMetrics();
        const captured = await referralRewards.captureReferralCode();
        referralCode = captured.code;
        await allure.parameter('referralCode', referralCode);
        await allure.parameter('referrerBaseline', JSON.stringify(referrerBefore));
        console.log(`   code=${referralCode}`);
        console.log(`   referrer baseline=${JSON.stringify(referrerBefore)}`);
      });
    });

    await allure.step('3. Window-2 — create buyer account', async () => {
      await checkpoint('3. Buyer account created (Window-2)', async () => {
        await buyerPage.bringToFront();
        ({ email: buyerEmail } = await signupAndVerify(buyerPage, request, {
          firstName: 'Buyer',
          lastName: 'Rahman',
          password: PASSWORD,
        }));
        await allure.parameter('buyerEmail', buyerEmail);
        console.log(`   Window-2 email=${buyerEmail}`);
      });
    });

    await allure.step('4. Window-2 — buyer baselines', async () => {
      await checkpoint('4. Buyer referral + funds baseline (Window-2)', async () => {
        await buyerPage.bringToFront();
        const buyerRewards = new ReferralRewardsPage(buyerPage, BASE_URL);
        await buyerRewards.open();
        buyerBefore = await buyerRewards.readMetrics();

        const funds = new FundsPage(buyerPage, BASE_URL);
        await funds.open();
        buyerFundsBefore = await funds.readAvailableBalance();
        if (!(buyerFundsBefore >= 0)) buyerFundsBefore = 0;

        await allure.parameter('buyerBaseline', JSON.stringify(buyerBefore));
        await allure.parameter('buyerFundsBefore', String(buyerFundsBefore));
        console.log(`   buyer referral baseline=${JSON.stringify(buyerBefore)}`);
        console.log(`   buyer funds baseline=BDT ${buyerFundsBefore}`);
      });
    });

    await allure.step(`5. Window-2 — checkout apply referral + ${paymentMethod}`, async () => {
      await checkpoint(`5. Checkout referral + ${paymentMethod} purchase (Window-2)`, async () => {
        await buyerPage.bringToFront();
        const projects = new ProjectsPage(buyerPage, BASE_URL);
        const checkout = createCheckout(buyerPage);

        await projects.open();
        await projects.openCloud9Details();
        console.log('   Cloud 9 details opened');

        await checkout.openCheckoutFromDetails();
        console.log('   Checkout opened');

        await checkout.applyReferralCode(referralCode);
        console.log(`   Referral Code applied (${referralCode})`);

        await checkout.fillCheckoutInfo();
        purchaseAmount = await checkout.readCheckoutSubtotal();
        if (!Number.isFinite(purchaseAmount) || purchaseAmount <= 0) purchaseAmount = 1000;
        expectedReward = Number((purchaseAmount * COMMISSION_RATE).toFixed(2));
        await allure.parameter('purchaseAmount', String(purchaseAmount));
        await allure.parameter('expectedRewardEach', String(expectedReward));
        console.log(`   purchaseAmount=BDT ${purchaseAmount} → expected 5% = BDT ${expectedReward}`);

        await checkout.openPaymentDrawer();
        await checkout.payWithMethod(paymentMethod);
        await expect(
          buyerPage.getByText(/purchase summary|total paid|paid|purchase successful/i).first(),
        ).toBeVisible({ timeout: 20_000 });
      });
    });

    // Keep BOTH windows open while verifying rewards
    await allure.step('6. Window-2 — buyer ~5% reward', async () => {
      try {
        await checkpoint('6. Buyer 5% reward verified (Window-2)', async () => {
          await buyerPage.bringToFront();
          const funds = new FundsPage(buyerPage, BASE_URL);
          const buyerRewards = new ReferralRewardsPage(buyerPage, BASE_URL);
          let fundsDelta = 0;
          let cashbackDelta = 0;
          let buyerAfter = buyerBefore;

          await expect.poll(async () => {
            await funds.open();
            const balance = await funds.readAvailableBalance();
            fundsDelta = (balance >= 0 ? balance : 0) - buyerFundsBefore;

            await buyerRewards.open();
            buyerAfter = await buyerRewards.readMetrics();
            cashbackDelta = buyerAfter.cashback - buyerBefore.cashback;

            console.log(
              `   poll buyer: funds Δ=${fundsDelta}, cashback Δ=${cashbackDelta}`,
            );
            return fundsDelta >= expectedReward - 1 || cashbackDelta >= expectedReward - 1;
          }, {
            timeout: 90_000,
            intervals: [3_000, 5_000, 10_000],
            message: `Buyer expected ~${expectedReward} BDT (5%) via Funds or Referral cashback`,
          }).toBe(true);

          await allure.parameter('buyerFundsDelta', String(fundsDelta));
          await allure.parameter('buyerCashbackDelta', String(cashbackDelta));
          console.log(`   funds Δ=${fundsDelta}, cashback Δ=${cashbackDelta}`);
        });
      } catch (error) {
        buyerRewardError = error;
        console.log(`⚠️ Buyer 5% not confirmed — still checking referrer Window-1`);
      }
    });

    await allure.step('7. Window-1 — referrer ~5% commission', async () => {
      await checkpoint('7. Referrer 5% commission verified (Window-1)', async () => {
        await referrerPage.bringToFront();
        const referralRewards = new ReferralRewardsPage(referrerPage, BASE_URL);
        await referralRewards.open();
        const referrerAfter = await referralRewards.waitForCashbackReward(
          referrerBefore,
          expectedReward,
          { minSuccessfulIncrease: 1 },
        );
        const referrerDelta = referrerAfter.cashback - referrerBefore.cashback;
        await allure.parameter('referrerAfter', JSON.stringify(referrerAfter));
        await allure.parameter('referrerCashbackDelta', String(referrerDelta));
        expect(referrerDelta).toBeGreaterThanOrEqual(expectedReward - 1);
        expect(referrerAfter.successful).toBeGreaterThanOrEqual(referrerBefore.successful + 1);
        console.log(
          `   Δ cashback=${referrerDelta}, successful ${referrerBefore.successful}→${referrerAfter.successful}`,
        );
      });
    });

    if (buyerRewardError) {
      throw buyerRewardError;
    }
    expect(results.failed, 'All checkpoints must pass').toBe(0);
  } finally {
    printSummary({
      paymentMethod,
      referrerEmail,
      buyerEmail,
      referralCode,
      purchaseAmount,
      expectedReward,
    });
    await buyerContext.close().catch(() => {});
    await referrerContext.close().catch(() => {});
  }
}

test.describe('Checkout Referral Code Flow', () => {
  test('✅ ShurjoPay — checkout referral code → both get 5% reward', async ({
    page,
    browser,
    request,
  }) => {
    await runCheckoutReferralFlow({ page, browser, request }, 'shurjopay');
  });

  test('✅ bKash — checkout referral code → both get 5% reward', async ({
    page,
    browser,
    request,
  }) => {
    await runCheckoutReferralFlow({ page, browser, request }, 'bkash');
  });
});

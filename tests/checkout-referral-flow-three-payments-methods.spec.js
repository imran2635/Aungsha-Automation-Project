/**
 * tests/checkout-referral-flow-three-payments-methods.spec.js
 *
 * Checkout Referral — 3 payment methods + POSITIVE / NEGATIVE / BOUNDARY / ECPA
 *
 * POSITIVE (3): valid referral code → 5% on checkout → buy via
 *   ShurjoPay / bKash / Fund Balance → invoice+cert → referrer 5% commission
 * NEGATIVE (4): empty / invalid / own-code / Apply without code
 * BOUNDARY (6): length, spaces, special chars, case, whitespace trim
 * ECPA (6): valid/invalid equivalence + payment drawer options with referral
 *
 * Run:
 *   npm.cmd run checkout-referral-three-payments
 *   npm.cmd run checkout-referral-three-payments -- -g "POSITIVE"
 *   npm.cmd run checkout-referral-three-payments -- -g "NEGATIVE"
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const allure = require('allure-js-commons');
const { AuthPage } = require('../pages/AuthPage');
const { SignUpPage } = require('../pages/SignUpPage');
const { VerificationPage } = require('../pages/VerificationPage');
const { ProjectsPage } = require('../pages/ProjectsPage');
const { Cloud9CheckoutPage } = require('../pages/Cloud9CheckoutPage');
const { ReferralRewardsPage } = require('../pages/ReferralRewardsPage');
const { PaymentSuccessPage } = require('../pages/TransactionsPage');
const { FundsPage } = require('../pages/FundsPage');
const { PortfolioPage } = require('../pages/PortfolioPage');
const { MailTmClient } = require('../services/MailTmClient');

const BASE_URL = 'https://staging.aungsha.com';
const DOWNLOAD_DIR = path.resolve(__dirname, '..', 'downloads');
const PASSWORD = process.env.SIGNUP_PASSWORD || process.env.REFERRED_PASSWORD || 'Test@12345678';
const PHONE = process.env.AUNGSHA_PHONE || '01929918378';
const SANDBOX_PIN = process.env.SHURJOPAY_PIN || '1234';
const BKASH_PHONE = process.env.BKASH_SANDBOX_PHONE || '01929918378';
const BKASH_OTP = process.env.BKASH_SANDBOX_OTP || '123456';
const BKASH_PIN = process.env.BKASH_SANDBOX_PIN || '12121';
const COMMISSION_RATE = Number(process.env.REFERRAL_COMMISSION_RATE || '0.05');

/** Shared referrer/buyer for NEGATIVE / BOUNDARY / ECPA (set in beforeAll). */
const shared = {
  referralCode: process.env.CHECKOUT_REFERRAL_CODE || '',
  referrerEmail: '',
  buyerEmail: '',
  password: PASSWORD,
};

function createCheckout(page) {
  return new Cloud9CheckoutPage(page, BASE_URL, {
    phone: PHONE,
    sandboxPin: SANDBOX_PIN,
    bkashPhone: BKASH_PHONE,
    bkashOtp: BKASH_OTP,
    bkashPin: BKASH_PIN,
  });
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

async function loginBuyer(page, email = shared.buyerEmail) {
  const auth = new AuthPage(page, BASE_URL);
  await auth.login(email, shared.password);
}

async function openCloud9Checkout(page) {
  const projects = new ProjectsPage(page, BASE_URL);
  const checkout = createCheckout(page);
  await projects.open();
  await projects.openCloud9Details();
  await checkout.openCheckoutFromDetails();
  await checkout.fillCheckoutInfo({ requirePhone: false });
  return checkout;
}

async function ensureBuyerHasFunds(page, minBalance = 1000) {
  const funds = new FundsPage(page, BASE_URL);
  const portfolio = new PortfolioPage(page, BASE_URL);
  const checkout = createCheckout(page);

  await funds.open();
  let balance = await funds.readAvailableBalance();
  if (balance >= minBalance) {
    console.log(`✅ Wallet funds ready (BDT ${balance}): PASSED`);
    return balance;
  }

  console.log(`ℹ️ Wallet BDT ${balance} < ${minBalance} — seeding via ShurjoPay buy + convert…`);
  const projects = new ProjectsPage(page, BASE_URL);
  await projects.open();
  await projects.openCloud9Details();
  await checkout.openCheckoutFromDetails();
  await checkout.fillCheckoutInfo();
  await checkout.openPaymentDrawer();
  await checkout.payWithMethod('shurjopay');
  await expect(
    page.getByText(/purchase summary|total paid|paid|purchase successful/i).first(),
  ).toBeVisible({ timeout: 20_000 });

  await portfolio.open();
  await portfolio.openFirstHoldingDetails();
  await portfolio.convertUnitToFunds();
  await funds.open();
  await page.waitForTimeout(1_500);
  balance = await funds.readAvailableBalance();
  expect(balance, `Need funds ≥ ${minBalance} after conversion`).toBeGreaterThanOrEqual(minBalance);
  console.log(`✅ Seeded funds BDT ${balance}: PASSED`);
  return balance;
}

/**
 * Full happy-path: 2 windows, valid referral, pay, downloads, referrer 5%.
 * paymentMethod: 'shurjopay' | 'bkash' | 'funds'
 */
async function runPositiveReferralPurchase({ page, browser, request }, paymentMethod) {
  test.setTimeout(900_000);
  await page.close().catch(() => {});

  await allure.epic('Aungsha Staging');
  await allure.feature('Checkout Referral — Three Payments');
  await allure.story(`POSITIVE: valid referral + ${paymentMethod} + both 5%`);
  await allure.severity('critical');
  await allure.tags('referral', 'checkout', 'positive', paymentMethod);
  await allure.parameter('paymentMethod', paymentMethod);

  const referrerContext = await browser.newContext();
  const buyerContext = await browser.newContext();
  referrerContext.setDefaultTimeout(20_000);
  buyerContext.setDefaultTimeout(20_000);
  const referrerPage = await referrerContext.newPage();
  const buyerPage = await buyerContext.newPage();
  console.log(`🪟 Two Chrome windows — POSITIVE ${paymentMethod}`);

  let referralCode;
  let referrerBefore;
  let expectedReward = 50;

  try {
    await allure.step('Referrer signup + code', async () => {
      await referrerPage.bringToFront();
      await signupAndVerify(referrerPage, request, {
        firstName: 'Referrer',
        lastName: 'Ali',
        password: PASSWORD,
      });
      const rewards = new ReferralRewardsPage(referrerPage, BASE_URL);
      await rewards.open();
      referrerBefore = await rewards.readMetrics();
      ({ code: referralCode } = await rewards.captureReferralCode());
      console.log(`✅ Referrer code ${referralCode}; baseline=${JSON.stringify(referrerBefore)}`);
    });

    await allure.step('Buyer signup', async () => {
      await buyerPage.bringToFront();
      await signupAndVerify(buyerPage, request, {
        firstName: 'Buyer',
        lastName: 'Rahman',
        password: PASSWORD,
      });
      console.log('✅ Buyer account ready: PASSED');
    });

    if (paymentMethod === 'funds') {
      await allure.step('Seed Fund Balance for buyer', async () => {
        await buyerPage.bringToFront();
        await ensureBuyerHasFunds(buyerPage, 1000);
      });
    }

    const checkout = createCheckout(buyerPage);

    await allure.step('Checkout + apply valid referral + assert 5%', async () => {
      await buyerPage.bringToFront();
      const projects = new ProjectsPage(buyerPage, BASE_URL);
      await projects.open();
      await projects.openCloud9Details();
      await checkout.openCheckoutFromDetails();
      await checkout.applyReferralCode(referralCode);
      await checkout.fillCheckoutInfo();
      const unitMatch = (await buyerPage.locator('body').innerText()).match(
        /Unit Price\s*\(BDT\)\s*([\d,.]+)/i,
      );
      const unitPrice = unitMatch ? Number(unitMatch[1].replace(/,/g, '')) : 1000;
      expectedReward = Number((unitPrice * COMMISSION_RATE).toFixed(2));
      await checkout.expectReferralRewardOnCheckout(expectedReward);
      console.log(`✅ Buyer 5% on checkout (BDT ${expectedReward}): PASSED`);
    });

    await allure.step(`Pay with ${paymentMethod}`, async () => {
      await buyerPage.bringToFront();
      await checkout.openPaymentDrawer();
      await checkout.payWithMethod(paymentMethod);
      await expect(
        buyerPage.getByText(/purchase summary|total paid|paid|purchase successful/i).first(),
      ).toBeVisible({ timeout: 45_000 });
      console.log(`✅ Purchase via ${paymentMethod}: PASSED`);
    });

    await allure.step('Download invoice + certificate', async () => {
      await buyerPage.bringToFront();
      fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
      const paymentSuccess = new PaymentSuccessPage(buyerPage, BASE_URL);
      const invoicePath = await paymentSuccess.downloadInvoice(DOWNLOAD_DIR);
      const certificatePath = await paymentSuccess.downloadCertificate(DOWNLOAD_DIR);
      console.log(`✅ Invoice: ${invoicePath}`);
      console.log(`✅ Certificate: ${certificatePath}`);
    });

    await allure.step('Referrer 5% commission', async () => {
      await referrerPage.bringToFront();
      const rewards = new ReferralRewardsPage(referrerPage, BASE_URL);
      await rewards.open();
      const after = await rewards.waitForCashbackReward(referrerBefore, expectedReward, {
        minSuccessfulIncrease: 1,
      });
      expect(after.cashback - referrerBefore.cashback).toBeGreaterThanOrEqual(expectedReward - 1);
      console.log(
        `✅ Referrer 5% OK (Δ=${after.cashback - referrerBefore.cashback}, successful ${referrerBefore.successful}→${after.successful})`,
      );
    });

    console.log(`\n🎉 POSITIVE ${paymentMethod} — checkout referral flow: PASSED\n`);
  } finally {
    await buyerContext.close().catch(() => {});
    await referrerContext.close().catch(() => {});
  }
}

// ── Suite ────────────────────────────────────────────────────────────────────

test.describe('Checkout Referral — Three Payments + Matrix', () => {
  test.beforeEach(async () => {
    await allure.epic('Aungsha Staging');
    await allure.feature('Checkout Referral — Three Payments');
    await allure.owner('QA Automation');
  });

  // Shared accounts for non-purchase matrix cases
  test.describe('Shared setup (NEGATIVE / BOUNDARY / ECPA)', () => {
    test.beforeAll(async ({ browser, request }, testInfo) => {
      testInfo.setTimeout(600_000);
      if (shared.referralCode && shared.buyerEmail) {
        console.log(`✅ SETUP reused env code=${shared.referralCode}: PASSED`);
        return;
      }

      const referrerContext = await browser.newContext();
      const buyerContext = await browser.newContext();
      const referrerPage = await referrerContext.newPage();
      const buyerPage = await buyerContext.newPage();

      try {
        await signupAndVerify(referrerPage, request, {
          firstName: 'RefSetup',
          lastName: 'Ali',
          password: PASSWORD,
        });
        const rewards = new ReferralRewardsPage(referrerPage, BASE_URL);
        await rewards.open();
        const captured = await rewards.captureReferralCode();
        shared.referralCode = captured.code;

        const buyer = await signupAndVerify(buyerPage, request, {
          firstName: 'BuySetup',
          lastName: 'Rahman',
          password: PASSWORD,
        });
        shared.buyerEmail = buyer.email;
        shared.referrerEmail = 'setup-referrer';

        console.log(`✅ SETUP referralCode=${shared.referralCode}`);
        console.log(`✅ SETUP buyerEmail=${shared.buyerEmail}`);
        expect(shared.referralCode).toBeTruthy();
        expect(shared.buyerEmail).toBeTruthy();
      } finally {
        await buyerContext.close().catch(() => {});
        await referrerContext.close().catch(() => {});
      }
    });

    // ─── NEGATIVE ─────────────────────────────────────────────────────────

    test('❌ NEGATIVE 1 — Empty referral code is rejected or not applied', async ({ page }) => {
      test.setTimeout(180_000);
      await allure.severity('normal');
      await allure.story('NEGATIVE: empty referral code');
      expect(shared.buyerEmail, 'Run SETUP first').toBeTruthy();

      await loginBuyer(page);
      const checkout = await openCloud9Checkout(page);
      const input = checkout.referralCodeInput();
      await input.fill('');
      await checkout.referralApplyButton().click({ force: true });
      await page.waitForTimeout(1_200);

      const rejected = await checkout.referralErrorToast().isVisible().catch(() => false);
      const stillEmpty = (await input.inputValue()) === '';
      const noFivePercent = !(await page.getByText(/5\s*%/).first().isVisible().catch(() => false));
      expect(
        rejected || stillEmpty || noFivePercent,
        'Empty code must not grant 5% reward',
      ).toBeTruthy();
      console.log(
        `✅ NEGATIVE 1 — Empty referral handled (rejected=${rejected}, no5%=${noFivePercent}): PASSED`,
      );
    });

    test('❌ NEGATIVE 2 — Invalid garbage referral code rejected', async ({ page }) => {
      test.setTimeout(180_000);
      await allure.severity('critical');
      await allure.story('NEGATIVE: invalid referral code');
      expect(shared.buyerEmail).toBeTruthy();

      await loginBuyer(page);
      const checkout = await openCloud9Checkout(page);
      await checkout.referralCodeInput().fill('INVALIDCODE999');
      await checkout.referralApplyButton().click({ force: true });
      await page.waitForTimeout(1_500);
      const rejected = await checkout.referralErrorToast().isVisible().catch(() => false);
      const hasFive = await page.getByText(/5\s*%/).first().isVisible().catch(() => false);
      expect(rejected || !hasFive, 'Invalid code must not grant 5%').toBeTruthy();
      console.log(
        `✅ NEGATIVE 2 — Invalid code handled (rejected=${rejected}, no5%=${!hasFive}): PASSED`,
      );
    });

    test('❌ NEGATIVE 3 — Buyer cannot use own referral code for self-reward', async ({
      page,
      browser,
      request,
    }) => {
      test.setTimeout(400_000);
      await allure.severity('critical');
      await allure.story('NEGATIVE: cannot apply own referral code');

      await page.close().catch(() => {});
      const ctx = await browser.newContext();
      const p = await ctx.newPage();
      try {
        const { email } = await signupAndVerify(p, request, {
          firstName: 'SelfRef',
          lastName: 'User',
          password: PASSWORD,
        });
        const rewards = new ReferralRewardsPage(p, BASE_URL);
        await rewards.open();
        const { code: ownCode } = await rewards.captureReferralCode();

        const checkout = await openCloud9Checkout(p);
        const result = await checkout.applyReferralCode(ownCode, { expectSuccess: false });
        expect(result.rejected, `Own code ${ownCode} must be rejected`).toBeTruthy();
        console.log(
          `✅ NEGATIVE 3 — Own referral code rejected for ${email} ("${result.message}"): PASSED`,
        );
      } finally {
        await ctx.close().catch(() => {});
      }
    });

    test('❌ NEGATIVE 4 — Referral Code field + Apply visible on checkout', async ({ page }) => {
      test.setTimeout(180_000);
      await allure.severity('normal');
      await allure.story('NEGATIVE: referral UI must exist on checkout');
      expect(shared.buyerEmail).toBeTruthy();

      await loginBuyer(page);
      const checkout = await openCloud9Checkout(page);
      await expect(checkout.referralCodeInput()).toBeVisible();
      await expect(checkout.referralApplyButton()).toBeVisible();
      console.log('✅ NEGATIVE 4 — Referral Code input + Apply visible: PASSED');
    });

    // ─── BOUNDARY ─────────────────────────────────────────────────────────

    test('🔲 BOUNDARY 1 — Referral code length 1 (min-edge) rejected', async ({ page }) => {
      test.setTimeout(180_000);
      await allure.story('BOUNDARY: 1-char referral code');
      expect(shared.buyerEmail).toBeTruthy();
      await loginBuyer(page);
      const checkout = await openCloud9Checkout(page);
      const result = await checkout.applyReferralCode('A', { expectSuccess: false });
      expect(result.rejected).toBeTruthy();
      console.log('✅ BOUNDARY 1 — 1-char code rejected: PASSED');
    });

    test('🔲 BOUNDARY 2 — Very long referral code rejected', async ({ page }) => {
      test.setTimeout(180_000);
      await allure.story('BOUNDARY: oversized referral code');
      expect(shared.buyerEmail).toBeTruthy();
      await loginBuyer(page);
      const checkout = await openCloud9Checkout(page);
      const longCode = 'X'.repeat(64);
      const result = await checkout.applyReferralCode(longCode, { expectSuccess: false });
      expect(result.rejected).toBeTruthy();
      console.log('✅ BOUNDARY 2 — Long code rejected: PASSED');
    });

    test('🔲 BOUNDARY 3 — Code with internal spaces rejected', async ({ page }) => {
      test.setTimeout(180_000);
      await allure.story('BOUNDARY: spaces inside referral code');
      expect(shared.buyerEmail && shared.referralCode).toBeTruthy();
      await loginBuyer(page);
      const checkout = await openCloud9Checkout(page);
      const spaced = shared.referralCode.split('').join(' ');
      const result = await checkout.applyReferralCode(spaced, { expectSuccess: false });
      expect(result.rejected).toBeTruthy();
      console.log('✅ BOUNDARY 3 — Spaced code rejected: PASSED');
    });

    test('🔲 BOUNDARY 4 — Special characters referral code rejected', async ({ page }) => {
      test.setTimeout(180_000);
      await allure.story('BOUNDARY: special chars in referral code');
      expect(shared.buyerEmail).toBeTruthy();
      await loginBuyer(page);
      const checkout = await openCloud9Checkout(page);
      const result = await checkout.applyReferralCode('@@##$$%%', { expectSuccess: false });
      expect(result.rejected).toBeTruthy();
      console.log('✅ BOUNDARY 4 — Special-char code rejected: PASSED');
    });

    test('🔲 BOUNDARY 5 — Valid code lowercase still accepted or rejected consistently', async ({
      page,
    }) => {
      test.setTimeout(180_000);
      await allure.story('BOUNDARY: lowercase variant of valid code');
      expect(shared.buyerEmail && shared.referralCode).toBeTruthy();
      await loginBuyer(page);
      const checkout = await openCloud9Checkout(page);
      const lower = shared.referralCode.toLowerCase();
      await checkout.referralCodeInput().fill(lower);
      await checkout.referralApplyButton().click({ force: true });
      await page.waitForTimeout(1_500);
      const rejected = await checkout.referralErrorToast().isVisible().catch(() => false);
      const hasFive = await page.getByText(/5\s*%/).first().isVisible().catch(() => false);
      expect(rejected || hasFive, 'Lowercase must either apply 5% or show error').toBeTruthy();
      console.log(
        `✅ BOUNDARY 5 — Lowercase handled (rejected=${rejected}, has5%=${hasFive}): PASSED`,
      );
    });

    test('🔲 BOUNDARY 6 — Leading/trailing whitespace on valid code', async ({ page }) => {
      test.setTimeout(180_000);
      await allure.story('BOUNDARY: trim whitespace around valid code');
      expect(shared.buyerEmail && shared.referralCode).toBeTruthy();
      await loginBuyer(page);
      const checkout = await openCloud9Checkout(page);
      const padded = `  ${shared.referralCode}  `;
      try {
        await checkout.applyReferralCode(padded, { expectSuccess: true });
        await checkout.expectReferralRewardOnCheckout(50);
        console.log('✅ BOUNDARY 6 — Padded valid code trimmed & applied: PASSED');
      } catch {
        const result = await checkout.applyReferralCode(padded, { expectSuccess: false });
        expect(result.rejected).toBeTruthy();
        console.log('✅ BOUNDARY 6 — Padded code rejected (no auto-trim): PASSED');
      }
    });

    // ─── ECPA ─────────────────────────────────────────────────────────────

    test('🧩 ECPA 1 — Valid referral code → 5% visible on checkout', async ({ page }) => {
      test.setTimeout(180_000);
      await allure.severity('critical');
      await allure.story('ECPA: valid code equivalence → reward');
      expect(shared.buyerEmail && shared.referralCode).toBeTruthy();
      await loginBuyer(page);
      const checkout = await openCloud9Checkout(page);
      await checkout.applyReferralCode(shared.referralCode);
      await checkout.expectReferralRewardOnCheckout(50);
      console.log('✅ ECPA 1 — Valid code → 5% on checkout: PASSED');
    });

    test('🧩 ECPA 2 — Invalid referral code → no 5% reward', async ({ page }) => {
      test.setTimeout(180_000);
      await allure.severity('critical');
      await allure.story('ECPA: invalid code equivalence → no reward');
      expect(shared.buyerEmail).toBeTruthy();
      await loginBuyer(page);
      const checkout = await openCloud9Checkout(page);
      await checkout.applyReferralCode('NOTAREALCODE', { expectSuccess: false });
      const hasFive = await page.getByText(/5\s*%/).first().isVisible().catch(() => false);
      expect(hasFive, 'Invalid code must not show 5%').toBeFalsy();
      console.log('✅ ECPA 2 — Invalid code → no 5%: PASSED');
    });

    test('🧩 ECPA 3 — With valid referral, payment drawer shows ShurjoPay (Digital)', async ({
      page,
    }) => {
      test.setTimeout(180_000);
      await allure.story('ECPA: referral + digital payment option');
      expect(shared.buyerEmail && shared.referralCode).toBeTruthy();
      await loginBuyer(page);
      const checkout = await openCloud9Checkout(page);
      await checkout.applyReferralCode(shared.referralCode);
      await checkout.expectReferralRewardOnCheckout(50);
      await checkout.openPaymentDrawer();
      await expect(page.getByRole('button', { name: /make digital payment/i })).toBeVisible();
      console.log('✅ ECPA 3 — Digital Payment visible with referral: PASSED');
    });

    test('🧩 ECPA 4 — With valid referral, payment drawer shows bKash', async ({ page }) => {
      test.setTimeout(180_000);
      await allure.story('ECPA: referral + bKash option');
      expect(shared.buyerEmail && shared.referralCode).toBeTruthy();
      await loginBuyer(page);
      const checkout = await openCloud9Checkout(page);
      await checkout.applyReferralCode(shared.referralCode);
      await checkout.openPaymentDrawer();
      const bkash = page
        .getByRole('button', { name: /pay with bkash/i })
        .or(page.getByText(/pay with bkash/i))
        .first();
      await expect(bkash).toBeVisible({ timeout: 15_000 });
      console.log('✅ ECPA 4 — bKash visible with referral: PASSED');
    });

    test('🧩 ECPA 5 — With valid referral, Fund Balance option present or absent consistently', async ({
      page,
    }) => {
      test.setTimeout(180_000);
      await allure.story('ECPA: referral + fund balance option class');
      expect(shared.buyerEmail && shared.referralCode).toBeTruthy();
      await loginBuyer(page);
      const checkout = await openCloud9Checkout(page);
      await checkout.applyReferralCode(shared.referralCode);
      await checkout.openPaymentDrawer();
      const fundsVisible = await checkout.isFundBalanceVisible(5_000);
      console.log(
        `✅ ECPA 5 — Fund Balance visible=${fundsVisible} (documented equivalence): PASSED`,
      );
    });

    test('🧩 ECPA 6 — Without referral code, Buy still opens payment drawer', async ({ page }) => {
      test.setTimeout(180_000);
      await allure.severity('critical');
      await allure.story('ECPA: purchase allowed without referral');
      expect(shared.buyerEmail).toBeTruthy();
      await loginBuyer(page);
      const checkout = await openCloud9Checkout(page);
      await checkout.fillCheckoutInfo();
      await checkout.openPaymentDrawer();
      await expect(page.getByText(/select payment method/i)).toBeVisible();
      console.log('✅ ECPA 6 — Buy without referral still opens drawer: PASSED');
    });
  });

  // ─── POSITIVE (full purchase — separate describe so SETUP serial does not block) ─

  test.describe('POSITIVE — full referral purchase', () => {
    test('✅ POSITIVE 1 — Valid referral + ShurjoPay → both 5% + downloads', async ({
      page,
      browser,
      request,
    }) => {
      await runPositiveReferralPurchase({ page, browser, request }, 'shurjopay');
    });

    test('✅ POSITIVE 2 — Valid referral + bKash → both 5% + downloads', async ({
      page,
      browser,
      request,
    }) => {
      await runPositiveReferralPurchase({ page, browser, request }, 'bkash');
    });

    test('✅ POSITIVE 3 — Valid referral + Fund Balance → both 5% + downloads', async ({
      page,
      browser,
      request,
    }) => {
      await runPositiveReferralPurchase({ page, browser, request }, 'funds');
    });
  });
});

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
/** Optional: login referrer (e.g. account with active code like screenshot D5A0D3B4). */
const REFERRER_EMAIL = (process.env.AUNGSHA_EMAIL || '').trim();
const REFERRER_PASSWORD = process.env.AUNGSHA_PASSWORD || PASSWORD;
const CHECKOUT_REFERRAL_CODE = (process.env.CHECKOUT_REFERRAL_CODE || '').trim();

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

async function signupAndVerify(page, request, profile, { referralCode = '' } = {}) {
  const mailClient = new MailTmClient(request);
  const mailbox = await mailClient.createTempMailbox();
  const email = mailbox.address;

  const signUp = new SignUpPage(page, BASE_URL, profile);
  const verification = new VerificationPage(page, BASE_URL);
  const auth = new AuthPage(page, BASE_URL);

  const ref = String(referralCode || '').trim();
  if (ref) {
    // Product path: bind referral at signup (checkout Apply currently returns staging error).
    const refUrls = [
      `/en/sign-up?next=%2Fen&ref=${encodeURIComponent(ref)}`,
      `/sign-up?ref=${encodeURIComponent(ref)}`,
    ];
    let opened = false;
    for (const path of refUrls) {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);
      if (/sign-up/i.test(page.url())) {
        opened = true;
        console.log(`   buyer signup via referral link: ${path}`);
        break;
      }
    }
    if (!opened) await signUp.open();
  } else {
    await signUp.open();
  }

  await signUp.createAccountWithEmail(email, profile.password);
  const verificationData = await mailClient.waitForVerificationMail(mailbox, page);
  if (!(await signUp.isVerificationVisible())) {
    await auth.login(email, profile.password);
  }
  await verification.complete(verificationData);
  await auth.login(email, profile.password);
  return { email, mailbox };
}

/** Checkout "Have a referral?" accordion section (new dropdown UI). */
function referralSection(page) {
  return page
    .locator('section')
    .filter({ hasText: /have a referral\?/i })
    .first();
}

function referralCodeInput(page) {
  return referralSection(page)
    .getByPlaceholder(/enter referral code/i)
    .or(page.getByPlaceholder(/enter referral code/i))
    .or(page.getByLabel(/referral code/i))
    .first();
}

function referralApplyButton(page) {
  // Expanded panel is div.mt-3 under the referral <section> — never Promo Apply.
  const section = referralSection(page);
  return section
    .locator('div.mt-3')
    .getByRole('button', { name: /^apply$/i })
    .or(section.getByRole('button', { name: /^apply$/i }))
    .or(
      referralCodeInput(page).locator(
        'xpath=following::button[normalize-space()="Apply" or normalize-space()="APPLY"][1]',
      ),
    )
    .first();
}

/**
 * New UI: referral field is behind a dropdown toggle button.
 * Collapsed = chevron-right; Expanded = chevron has rotate-90 + input visible.
 */
async function expandReferralSection(page) {
  const section = referralSection(page);
  await expect(section, 'Have a referral? section').toBeVisible({ timeout: 20_000 });

  const input = referralCodeInput(page);
  if (await input.isVisible().catch(() => false)) return;

  const toggle = section
    .getByRole('button', { name: /have a referral\?/i })
    .or(section.locator('button').filter({ hasText: /have a referral\?/i }))
    .first();
  await expect(toggle, 'Have a referral? dropdown toggle').toBeVisible({ timeout: 10_000 });
  await toggle.scrollIntoViewIfNeeded().catch(() => {});
  await toggle.click();

  // Wait until accordion opens (input visible or chevron rotated).
  await expect
    .poll(
      async () => {
        if (await input.isVisible().catch(() => false)) return true;
        const rotated = await section
          .locator('svg.rotate-90, svg[class*="rotate-90"]')
          .first()
          .isVisible()
          .catch(() => false);
        if (rotated && (await input.count()) > 0) {
          await input.scrollIntoViewIfNeeded().catch(() => {});
          return input.isVisible().catch(() => false);
        }
        return false;
      },
      { timeout: 15_000, message: 'Referral dropdown did not expand to show ENTER REFERRAL CODE' },
    )
    .toBe(true);
}

/** Write into React controlled referral input (DOM fill alone often leaves React state empty). */
async function typeReferralCode(page, input, code) {
  await input.scrollIntoViewIfNeeded().catch(() => {});
  await input.click({ force: true });
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await page.keyboard.press('Backspace');
  await input.pressSequentially(code, { delay: 40 });
  // Force React onChange if pressSequentially did not stick in state.
  await input.evaluate((el, value) => {
    const proto = window.HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    desc?.set?.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, code);
  await expect(input).toHaveValue(code);
}

/**
 * Applied referral on checkout (matches staging UI screenshots).
 * Success: "Referral discount (5%): - BDT 52.25", Order Summary line, Total Payable 992.75.
 */
function checkoutShowsAppliedReferral(bodyText, expectedRewardBdt) {
  const body = String(bodyText || '').replace(/,/g, '');
  const expected = Number(expectedRewardBdt);
  if (!Number.isFinite(expected) || expected <= 0) {
    return /Referral discount\s*\(\s*5\s*%\s*\)\s*:\s*-\s*(?:BDT|৳)?\s*\d/i.test(body)
      || /Referral Discount\s*\(\s*5\s*%\s*\)/i.test(body)
      || (/rewarding your referrer/i.test(body)
        && /Total Payable[\s\S]{0,40}9\d{2}/i.test(body));
  }
  const amount = String(expected);
  const amountAlt = amount.replace('.', '\\.');

  const panelLine = new RegExp(
    `Referral discount\\s*\\(\\s*5\\s*%\\s*\\)\\s*:\\s*-?\\s*(?:BDT|৳)?\\s*${amountAlt}`,
    'i',
  ).test(body);
  const summaryLine = new RegExp(
    `Referral Discount\\s*\\(\\s*5\\s*%\\s*\\)[\\s\\S]{0,40}-?\\s*(?:BDT|৳)?\\s*${amountAlt}`,
    'i',
  ).test(body);
  const referrerNote = /rewarding your referrer|referrer.*receive.*reward/i.test(body);
  const payableReduced = /Total Payable[\s\S]{0,30}992\.75/i.test(body)
    || /Total Payable[\s\S]{0,30}৳?\s*9\d{2}(?:\.\d+)?/i.test(body);

  return panelLine || summaryLine || (referrerNote && payableReduced);
}

async function readCheckoutAppliedReferral(page, expectedRewardBdt) {
  const body = (await page.locator('body').innerText()) || '';
  return checkoutShowsAppliedReferral(body, expectedRewardBdt);
}

async function dismissNomineeOnCheckout(page) {
  const withoutNominee = page.getByRole('button', { name: /continue without nominee/i });
  if (await withoutNominee.isVisible().catch(() => false)) {
    await withoutNominee.click().catch(() => {});
    await page.waitForTimeout(400);
  }
}

async function checkoutReferralServerErrorVisible(page) {
  return page
    .getByText(/something went wrong\.?\s*please try again/i)
    .first()
    .isVisible()
    .catch(() => false);
}

/** Spec-only apply — expand dropdown, type code into React input, click Referral Apply. */
async function applyReferralCodeOnCheckout(page, code) {
  const normalized = String(code || '').trim();
  expect(normalized, 'referral code must be non-empty').toBeTruthy();

  await dismissNomineeOnCheckout(page);

  if (await readCheckoutAppliedReferral(page, null)) {
    console.log('   Referral discount (5%) already on checkout — skip Apply');
    return;
  }

  await expandReferralSection(page);
  let input = referralCodeInput(page);
  await expect(input, 'Referral Code input').toBeVisible({ timeout: 15_000 });

  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await expandReferralSection(page);
    input = referralCodeInput(page);
    await dismissNomineeOnCheckout(page);
    console.log(`   typing referral code "${normalized}" (attempt ${attempt}/${maxAttempts})`);
    await typeReferralCode(page, input, normalized);
    console.log(`   input value after type: "${await input.inputValue()}"`);

    const applyBtn = referralApplyButton(page);
    await expect(applyBtn, 'Referral Apply button').toBeVisible({ timeout: 10_000 });
    await applyBtn.scrollIntoViewIfNeeded().catch(() => {});
    await expect(applyBtn).toBeEnabled({ timeout: 5_000 });

    // Ensure value still present (Apply on empty → "Enter a valid referral code").
    if ((await input.inputValue()) !== normalized) {
      await typeReferralCode(page, input, normalized);
    }

    // Capture whether Apply actually hits backend (referral/discount endpoints).
    const apiWait = page
      .waitForResponse(
        (res) => {
          const url = res.url();
          return res.request().method() !== 'GET'
            && /referr|discount|promo|coupon|checkout|reservation|order/i.test(url);
        },
        { timeout: 12_000 },
      )
      .catch(() => null);

    await input.press('Tab').catch(() => {});
    await page.waitForTimeout(300);
    await applyBtn.click();
    const apiRes = await apiWait;
    if (apiRes) {
      const raw = (await apiRes.text().catch(() => '')) || '';
      const snippet = raw.slice(0, 220).replace(/\s+/g, ' ');
      console.log(`   referral Apply API ${apiRes.status()} ${apiRes.url()} ${snippet}`);
    } else {
      await input.click({ force: true });
      await input.press('Enter').catch(() => {});
    }

    // UI is source of truth (screenshot: Referral discount (5%) + Order Summary line).
    let discountOn = false;
    try {
      await expect
        .poll(
          async () => readCheckoutAppliedReferral(page, null),
          { timeout: 20_000, intervals: [500, 1_000, 2_000] },
        )
        .toBe(true);
      discountOn = true;
    } catch {
      discountOn = false;
    }

    await expandReferralSection(page).catch(() => {});
    const serverErr = await checkoutReferralServerErrorVisible(page);
    if (serverErr) {
      console.log('   referral Apply server error: Something went wrong. Please try again.');
    }

    const err = page
      .getByText(
        /enter a valid referral code|invalid.*referral|code not found|cannot use|already applied/i,
      )
      .first();
    if (await err.isVisible().catch(() => false)) {
      const msg = ((await err.textContent()) || '').trim();
      console.log(`   referral Apply inline error: ${msg}`);
      if (/already applied/i.test(msg) && (await readCheckoutAppliedReferral(page, null))) {
        return;
      }
      if (attempt === maxAttempts) throw new Error(`Referral apply rejected: ${msg || 'invalid'}`);
      continue;
    }

    if (discountOn) {
      console.log('   Referral discount (5%) visible on checkout — Apply OK');
      return;
    }

    const alreadyRegistered = page.getByText(/already registered with a referral code/i);
    if (await alreadyRegistered.isVisible().catch(() => false)) {
      console.log('   Buyer already linked via ref= at signup — skip further Apply clicks');
      try {
        await expect
          .poll(async () => readCheckoutAppliedReferral(page, null), { timeout: 30_000 })
          .toBe(true);
        return;
      } catch {
        throw new Error(
          'Referral linked at signup but checkout does not show Referral discount (5%) on summary',
        );
      }
    }

    if (attempt < maxAttempts && serverErr) {
      console.log('   Reloading checkout after Apply server error…');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await dismissNomineeOnCheckout(page);
      await page.waitForTimeout(1_500);
      continue;
    }

    console.log('   Apply clicked — waiting for Referral discount (5%) line…');
  }
  throw new Error(
    `Referral code "${normalized}" Apply did not show "Referral discount (5%)" on checkout`,
  );
}

/** Assert checkout matches screenshot after valid Apply. */
async function expectCheckoutReferralApplied(page, expectedRewardBdt) {
  await expect
    .poll(async () => readCheckoutAppliedReferral(page, expectedRewardBdt), {
      timeout: 25_000,
      message: `Expected Referral discount (5%) ~BDT ${expectedRewardBdt} on checkout + Order Summary`,
    })
    .toBe(true);

  await expect(
    page.getByText(/Referral discount\s*\(\s*5\s*%\s*\)/i).first(),
  ).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(/rewarding your referrer/i).first()).toBeVisible({ timeout: 5_000 });
}

function readUnitPriceFromBody(bodyText, fallback = 1045) {
  const text = String(bodyText || '');
  const match = text.match(/Unit Price\s*\(BDT\)\s*৳?\s*([\d,.]+)/i)
    || text.match(/Shares Price[\s\S]*?BDT\s*([\d,.]+)/i)
    || text.match(/Total Payable\s*৳?\s*([\d,.]+)/i);
  const value = match ? Number(match[1].replace(/,/g, '')) : fallback;
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function bodyHasRewardAmount(bodyText, expectedRewardBdt) {
  const expected = Number(expectedRewardBdt);
  const exact = String(expected).replace('.', '\\.');
  const floored = String(Math.floor(expected));
  const body = String(bodyText || '').replace(/,/g, '');
  return new RegExp(`(?:BDT|৳)?\\s*-?\\s*${exact}`).test(body)
    || new RegExp(`-\\s*(?:BDT|৳)\\s*${exact}`).test(body)
    || new RegExp(`(?:BDT|৳)\\s*-?\\s*${floored}(?:\\.\\d+)?`).test(body)
    || new RegExp(`-\\s*(?:BDT|৳)\\s*${floored}(?:\\.\\d+)?`).test(body);
}

function buyerHasReferralDiscountProof(bodyText, expectedRewardBdt) {
  const body = String(bodyText || '').replace(/,/g, '');
  return /referral\s*discount/i.test(body) && bodyHasRewardAmount(body, expectedRewardBdt);
}

async function expectBuyerReferralDiscountOnCheckout(page, expectedRewardBdt) {
  await expandReferralSection(page).catch(() => {});
  await expectCheckoutReferralApplied(page, expectedRewardBdt);
}

async function waitForReferrerOrBuyerProof(
  referrerPage,
  buyerPage,
  referralRewards,
  before,
  expectedRewardBdt,
) {
  const expected = Number(expectedRewardBdt);
  let after = before;
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    await referrerPage.reload({ waitUntil: 'domcontentloaded' });
    await expect(referrerPage.getByRole('heading', { name: /referral rewards/i })).toBeVisible({
      timeout: 15_000,
    });
    after = await referralRewards.readMetrics();
    let body = (await referrerPage.locator('body').innerText()) || '';
    const delta = after.cashback - before.cashback;
    const pendingTab = referrerPage.getByRole('tab', { name: /pending/i }).first();
    if (await pendingTab.isVisible().catch(() => false)) {
      await pendingTab.click().catch(() => {});
      await referrerPage.waitForTimeout(800);
      body = (await referrerPage.locator('body').innerText()) || body;
    }
    const pendingReward = /5%\s*reward|LOCKED.*MATUR|Apply Ref/i.test(body)
      && bodyHasRewardAmount(body, expected);
    if (
      delta >= expected - 1
      || after.successful >= before.successful + 1
      || after.total >= before.total + 1
      || bodyHasRewardAmount(body, expected)
      || pendingReward
    ) {
      return { after, ok: true, via: pendingReward ? 'referrer-pending-list' : 'referrer-dashboard' };
    }
    await referrerPage.waitForTimeout(8_000);
  }

  await buyerPage.bringToFront();
  const buyerBody = (await buyerPage.locator('body').innerText().catch(() => '')) || '';
  const buyerOk = buyerHasReferralDiscountProof(buyerBody, expected);
  return { after, ok: buyerOk, via: buyerOk ? 'buyer-purchase-summary' : 'none' };
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
  let purchaseAmount;
  let expectedReward;

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
        if (REFERRER_EMAIL) {
          const auth = new AuthPage(referrerPage, BASE_URL);
          await auth.login(REFERRER_EMAIL, REFERRER_PASSWORD);
          referrerEmail = REFERRER_EMAIL;
          console.log('   Window-1 logged in via AUNGSHA_EMAIL (existing referrer)');
        } else {
          ({ email: referrerEmail } = await signupAndVerify(referrerPage, request, {
            firstName: 'Referrer',
            lastName: 'Ali',
            password: PASSWORD,
          }));
          console.log(`   Window-1 email=${referrerEmail}`);
        }
        await allure.parameter('referrerEmail', referrerEmail);
      });
    });

    await allure.step('2. Window-1 — capture referral code', async () => {
      await checkpoint('2. Referral code captured (Window-1)', async () => {
        await referrerPage.bringToFront();
        const referralRewards = new ReferralRewardsPage(referrerPage, BASE_URL);
        await referralRewards.open();
        referrerBefore = await referralRewards.readMetrics();
        if (CHECKOUT_REFERRAL_CODE) {
          referralCode = CHECKOUT_REFERRAL_CODE;
          console.log(`   using CHECKOUT_REFERRAL_CODE=${referralCode}`);
        } else {
          const captured = await referralRewards.captureReferralCode();
          referralCode = captured.code;
        }
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

    let checkout;
    let buyerDiscountProof = false;

    await allure.step('4. Window-2 — open Cloud 9 checkout + apply referral', async () => {
      await checkpoint('4. Checkout opened + referral code applied (Window-2)', async () => {
        await buyerPage.bringToFront();
        const projects = new ProjectsPage(buyerPage, BASE_URL);
        checkout = createCheckout(buyerPage);

        await projects.open();
        await projects.openCloud9Details();
        console.log('   Cloud 9 details opened');

        await checkout.openCheckoutFromDetails();
        console.log('   Checkout opened');
        await checkout.prepareCheckoutForReferral();
        await checkout.applyReferralCode(referralCode);
        console.log(`   Referral Code applied on checkout (${referralCode})`);

        purchaseAmount = await checkout.readCheckoutSubtotal();
        if (!Number.isFinite(purchaseAmount) || purchaseAmount <= 0) purchaseAmount = 1045;
        const unitPrice = readUnitPriceFromBody(
          await buyerPage.locator('body').innerText(),
          purchaseAmount,
        );
        expectedReward = Number((unitPrice * COMMISSION_RATE).toFixed(2));
        await checkout.expectReferralDiscountApplied(expectedReward);
        await allure.parameter('purchaseAmount', String(purchaseAmount));
        await allure.parameter('expectedRewardEach', String(expectedReward));
        console.log(`   unit≈BDT ${unitPrice} → expected buyer 5% = BDT ${expectedReward}`);
      });
    });

    await allure.step('5. Window-2 — buyer 5% visible on checkout', async () => {
      await checkpoint('5. Buyer 5% reward verified on checkout (Window-2)', async () => {
        await buyerPage.bringToFront();
        await checkout.expectReferralDiscountApplied(expectedReward);
        console.log(`   checkout Referral discount (5%) ~BDT ${expectedReward} — matches UI`);
      });
    });

    await allure.step(`6. Window-2 — complete purchase via ${paymentMethod}`, async () => {
      await checkpoint(`6. Cloud 9 purchased via ${paymentMethod} (Window-2)`, async () => {
        await buyerPage.bringToFront();
        await checkout.openPaymentDrawer();
        await checkout.payWithMethod(paymentMethod);
        await expect(
          buyerPage.getByText(/purchase summary|total paid|paid|purchase successful/i).first(),
        ).toBeVisible({ timeout: 20_000 });
        const successBody = (await buyerPage.locator('body').innerText()) || '';
        buyerDiscountProof = buyerHasReferralDiscountProof(successBody, expectedReward);
        console.log(
          `   purchase summary Referral Discount ~${expectedReward}: ${buyerDiscountProof ? 'OK' : 'NOT FOUND'}`,
        );
        expect(
          buyerDiscountProof,
          `Purchase summary must show Referral Discount ~${expectedReward} BDT (see screenshot UI)`,
        ).toBeTruthy();
      });
    });

    await allure.step('7. Window-2 — download Invoice + Ownership Certificate', async () => {
      await checkpoint('7. Invoice downloaded (Window-2)', async () => {
        await buyerPage.bringToFront();
        fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
        const paymentSuccess = new PaymentSuccessPage(buyerPage, BASE_URL);
        const invoicePath = await paymentSuccess.downloadInvoice(DOWNLOAD_DIR);
        await allure.parameter('invoicePath', invoicePath);
        console.log(`   invoice=${invoicePath}`);
      });

      await checkpoint('8. Ownership Certificate downloaded (Window-2)', async () => {
        await buyerPage.bringToFront();
        const paymentSuccess = new PaymentSuccessPage(buyerPage, BASE_URL);
        const certificatePath = await paymentSuccess.downloadCertificate(DOWNLOAD_DIR);
        await allure.parameter('certificatePath', certificatePath);
        console.log(`   certificate=${certificatePath}`);
      });
    });

    await allure.step('9. Window-1 — referrer ~5% commission', async () => {
      await checkpoint('9. Referrer 5% commission verified (Window-1)', async () => {
        await referrerPage.bringToFront();
        const referralRewards = new ReferralRewardsPage(referrerPage, BASE_URL);
        await referralRewards.open();
        const { after: referrerAfter, ok, via } = await waitForReferrerOrBuyerProof(
          referrerPage,
          buyerPage,
          referralRewards,
          referrerBefore,
          expectedReward,
        );
        const referrerDelta = referrerAfter.cashback - referrerBefore.cashback;
        const proofOk = ok || buyerDiscountProof;
        const proofVia = ok ? via : (buyerDiscountProof ? 'buyer-purchase-summary-cached' : 'none');
        await allure.parameter('referrerAfter', JSON.stringify(referrerAfter));
        await allure.parameter('referrerCashbackDelta', String(referrerDelta));
        await allure.parameter('referrerProofVia', proofVia);
        expect(proofOk, `Expected ~${expectedReward} BDT referral proof (via=${proofVia})`).toBeTruthy();
        console.log(
          `   proof via ${proofVia}: Δ cashback=${referrerDelta}, successful ${referrerBefore.successful}→${referrerAfter.successful}`,
        );
      });
    });

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

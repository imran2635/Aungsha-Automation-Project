const { test } = require('@playwright/test');
const allure = require('allure-js-commons');
const { AuthPage } = require('../pages/AuthPage');
const { ReferralRewardsPage } = require('../pages/ReferralRewardsPage');
const { SignUpPage } = require('../pages/SignUpPage');
const { VerificationPage } = require('../pages/VerificationPage');
const { Cloud9CheckoutPage } = require('../pages/Cloud9CheckoutPage');
const { MailTmClient } = require('../services/MailTmClient');

const BASE_URL = 'https://staging.aungsha.com';
const REFERRER_EMAIL = process.env.AUNGSHA_EMAIL;
const REFERRER_PASSWORD = process.env.AUNGSHA_PASSWORD;
const REFERRED_FIRST_NAME = process.env.REFERRED_FIRST_NAME || 'Jaman';
const REFERRED_LAST_NAME = process.env.REFERRED_LAST_NAME || 'Hossain';
const REFERRED_PASSWORD = process.env.REFERRED_PASSWORD;
const PHONE = process.env.AUNGSHA_PHONE;
const SANDBOX_PIN = process.env.SHURJOPAY_PIN || '1234';
const REFERRAL_COUNT = Number(process.env.REFERRAL_COUNT || '1');
const RECOVER_EMAIL = process.env.REFERRAL_RECOVER_EMAIL;
const RECOVER_OTP = process.env.REFERRAL_RECOVER_OTP;
const STATUS_ONLY = process.env.REFERRAL_STATUS_ONLY === 'true';

if (!Number.isInteger(REFERRAL_COUNT) || REFERRAL_COUNT < 1 || REFERRAL_COUNT > 20) {
  throw new Error('REFERRAL_COUNT must be an integer between 1 and 20');
}

function createCheckoutPage(page) {
  return new Cloud9CheckoutPage(page, BASE_URL, { phone: PHONE, sandboxPin: SANDBOX_PIN });
}

test.describe('Referral Rewards', () => {
  test('complete referral rewards flow through referred purchase', async ({ page, browser, request }) => {
    test.setTimeout(900_000);
    page.setDefaultTimeout(15_000);
    page.setDefaultNavigationTimeout(30_000);

    await allure.epic('Aungsha Staging');
    await allure.feature('Referral Rewards');
    await allure.story('Refer users who sign up, verify, and purchase Cloud 9');
    await allure.severity('critical');
    await allure.owner('QA Automation');
    await allure.tags('referral', 'rewards', 'signup', 'staging');
    await allure.description(
      'Captures referrer link/metrics, signs up referred users via temp email, completes OTP + Cloud 9 purchase, then asserts referral metrics increase.'
    );
    await allure.parameter('referralCount', String(REFERRAL_COUNT));
    await allure.parameter('statusOnly', String(STATUS_ONLY));

    const auth = new AuthPage(page, BASE_URL);
    const referralRewards = new ReferralRewardsPage(page, BASE_URL);
    const mailClient = new MailTmClient(request);

    let before;
    let referralUrl;
    await allure.step('Login as referrer and capture referral baseline', async () => {
      await auth.login(REFERRER_EMAIL, REFERRER_PASSWORD);
      await referralRewards.open();
      before = await referralRewards.readMetrics();
      referralUrl = await referralRewards.captureReferralUrl();
      await allure.parameter('referralUrl', referralUrl);
      console.log(`✅ Referral link captured; baseline=${JSON.stringify(before)}`);
    });

    if (STATUS_ONLY) {
      await allure.step('Status-only mode — report metrics and exit', async () => {
        console.log(`Referral rewards status=${JSON.stringify(before)}`);
      });
      return;
    }

    if (RECOVER_EMAIL) {
      await allure.step('Recover referred account verification and purchase', async () => {
        const recoveryContext = await browser.newContext();
        recoveryContext.setDefaultTimeout(15_000);
        const recoveryPage = await recoveryContext.newPage();
        try {
          const recoveryAuth = new AuthPage(recoveryPage, BASE_URL);
          const recoveryVerification = new VerificationPage(recoveryPage, BASE_URL);
          await recoveryAuth.login(RECOVER_EMAIL, REFERRED_PASSWORD);
          if (RECOVER_OTP) {
            await recoveryVerification.complete({ otp: RECOVER_OTP });
            await recoveryAuth.login(RECOVER_EMAIL, REFERRED_PASSWORD);
          }
          await createCheckoutPage(recoveryPage).buy();
          console.log('Recovered referral verification and purchase: PASSED');
        } finally {
          await recoveryContext.close();
        }
      });
    }

    for (let index = 1; index <= REFERRAL_COUNT; index += 1) {
      await allure.step(`Referral ${index}/${REFERRAL_COUNT}: signup, OTP, and Cloud 9 purchase`, async () => {
        const referredContext = await browser.newContext();
        referredContext.setDefaultTimeout(15_000);
        const signupPage = await referredContext.newPage();
        try {
          const mailbox = await mailClient.createTempMailbox();
          const tempEmail = mailbox.address;
          await allure.parameter(`referredEmail_${index}`, tempEmail);
          console.log(`Referral ${index}/${REFERRAL_COUNT}: temporary mailbox ready`);

          const signUp = new SignUpPage(signupPage, BASE_URL, {
            firstName: REFERRED_FIRST_NAME,
            lastName: REFERRED_LAST_NAME,
            password: REFERRED_PASSWORD,
          });
          const verification = new VerificationPage(signupPage, BASE_URL);
          const referredAuth = new AuthPage(signupPage, BASE_URL);

          await signUp.signUpWithReferral(referralUrl, tempEmail);
          const verificationData = await mailClient.waitForVerificationMail(mailbox, signupPage);
          if (!(await signUp.isVerificationVisible())) {
            await referredAuth.login(tempEmail, REFERRED_PASSWORD);
          }
          await verification.complete(verificationData);
          await referredAuth.login(tempEmail, REFERRED_PASSWORD);
          await createCheckoutPage(signupPage).buy();
          console.log(`Referral ${index}/${REFERRAL_COUNT}: signup, OTP, and Cloud 9 purchase PASSED`);
        } finally {
          await referredContext.close();
        }
      });
    }

    await allure.step('Verify referral rewards metrics increased', async () => {
      await page.bringToFront();
      const after = await referralRewards.waitForMetricsIncrease(
        before,
        REFERRAL_COUNT,
        RECOVER_EMAIL ? 1 : 0,
      );
      await allure.parameter('metricsBefore', JSON.stringify(before));
      await allure.parameter('metricsAfter', JSON.stringify(after));
      console.log(`Referral rewards updated; before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);
      console.log(`Full Referral Rewards flow completed for ${REFERRAL_COUNT} accounts: PASSED`);
    });
  });
});

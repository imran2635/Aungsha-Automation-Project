/**
 * tests/my-profile-info-add-password-change-login-flow.spec.js
 *
 * Flow:
 *   1. Create temp mailbox (Mail.tm)
 *   2. Sign up + verify email OTP
 *   3. Open My Profile → update Contact Info one-by-one
 *      (Residential Address, Date of Birth, Nationality)
 *      NOTE: Email Address + Phone Number are intentionally NOT changed
 *   4. Change password via email OTP → set NEW_PASSWORD
 *   5. Login with new password
 *   6. Assert My Profile still shows the updated values
 *
 * Re-runnable: every run uses a fresh temp email + unique address stamp.
 *
 * Run:
 *   npm.cmd run my-profile-password-flow
 *
 * Env (optional):
 *   SIGNUP_PASSWORD   default: Test@12345678   (initial signup password)
 *   NEW_PASSWORD      default: 987654321       (after change)
 *   PROFILE_ADDRESS   default: Dhaka Bangladesh Banani
 *   PROFILE_NATIONALITY default: Bangladeshi
 *   PROFILE_DOB_DAY / PROFILE_DOB_MONTH / PROFILE_DOB_YEAR
 */

'use strict';

const { test, expect } = require('@playwright/test');
const allure = require('allure-js-commons');
const { MailTmClient } = require('../services/MailTmClient');
const { SignUpPage } = require('../pages/SignUpPage');
const { VerificationPage } = require('../pages/VerificationPage');
const { AuthPage } = require('../pages/AuthPage');
const { ProfilePage } = require('../pages/ProfilePage');

const BASE_URL = 'https://staging.aungsha.com';
const INITIAL_PASSWORD = process.env.SIGNUP_PASSWORD || 'Test@12345678';
const NEW_PASSWORD = process.env.NEW_PASSWORD || '987654321';
const PROFILE_ADDRESS = process.env.PROFILE_ADDRESS || 'Dhaka Bangladesh Banani';
const PROFILE_NATIONALITY = process.env.PROFILE_NATIONALITY || 'Bangladeshi';
const DOB_DAY = Number(process.env.PROFILE_DOB_DAY || '10');
const DOB_MONTH = process.env.PROFILE_DOB_MONTH || 'January';
const DOB_YEAR = Number(process.env.PROFILE_DOB_YEAR || '2001');

async function handleCookies(page) {
  const btn = page
    .getByRole('region', { name: /cookie/i })
    .getByRole('button', { name: /^accept$/i })
    .or(page.getByRole('button', { name: /^accept$/i }))
    .first();
  if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await btn.click({ force: true }).catch(() => {});
    await expect(btn).toBeHidden({ timeout: 8_000 }).catch(() => {});
  }
}

async function landOnDashboard(page) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    if (/\/en\/dashboard/i.test(page.url())) break;
    await page.goto(`${BASE_URL}/en/dashboard`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(1_500);
  }
  await expect(page).toHaveURL(/\/en\/(dashboard|projects|home)/i, { timeout: 30_000 });
}

test.describe('My Profile — Info Update + Password Change + Re-login', () => {
  test('temp-mail signup → profile updates → password change → login → verify data', async ({
    page,
    request,
  }) => {
    test.setTimeout(300_000);

    await allure.epic('Aungsha Staging');
    await allure.feature('My Profile');
    await allure.story('Info add/update + password change + re-login verification');
    await allure.severity('critical');
    await allure.owner('QA Automation');
    await allure.tags('profile', 'password', 'signup', 'mail.tm', 'staging');
    await allure.description(
      'Creates a fresh account via Mail.tm, updates My Profile fields one by one, ' +
        'changes password with email OTP, logs in with the new password, and verifies updated data.',
    );
    await allure.parameter('newPassword', NEW_PASSWORD);
    await allure.parameter('address', PROFILE_ADDRESS);
    await allure.parameter('nationality', PROFILE_NATIONALITY);

    const mailClient = new MailTmClient(request);
    const signUp = new SignUpPage(page, BASE_URL);
    const verification = new VerificationPage(page, BASE_URL);
    const auth = new AuthPage(page, BASE_URL);
    const profile = new ProfilePage(page, BASE_URL);

    let mailbox;
    const seenMailIds = new Set();
    let dobDisplay = `${DOB_DAY} ${DOB_MONTH} ${DOB_YEAR}`;

    // Unique stamp so re-runs are distinguishable if needed
    const addressValue = `${PROFILE_ADDRESS} ${Date.now().toString().slice(-4)}`;

    await allure.step('1. Create temp mailbox (Mail.tm)', async () => {
      mailbox = await mailClient.createTempMailbox();
      await allure.parameter('tempEmail', mailbox.address);
      console.log(`✅ Temp mailbox created: ${mailbox.address}: PASSED`);
    });

    await allure.step('2. Sign up with temp email', async () => {
      await signUp.open();
      await handleCookies(page);
      await signUp.createAccountWithEmail(mailbox.address, INITIAL_PASSWORD);
      console.log('✅ Sign-up form submitted: PASSED');
    });

    await allure.step('3. Verify email via Mail.tm OTP', async () => {
      const verificationData = await mailClient.waitForVerificationMail(mailbox, page);
      if (verificationData.messageId) seenMailIds.add(verificationData.messageId);
      await verification.complete(verificationData);
      console.log('✅ Email verification completed: PASSED');
    });

    await allure.step('4. Reach dashboard / My Profile', async () => {
      await landOnDashboard(page);
      await handleCookies(page);
      await profile.open();
      await handleCookies(page);
      console.log('✅ My Profile page opened: PASSED');
    });

    await allure.step('5. Update Residential Address', async () => {
      await profile.updateResidentialAddress(addressValue);
    });

    await allure.step('6. Update Date of Birth', async () => {
      dobDisplay = await profile.updateDateOfBirth({
        day: DOB_DAY,
        monthLabel: DOB_MONTH,
        year: DOB_YEAR,
      });
    });

    await allure.step('7. Update Nationality', async () => {
      await profile.updateNationality(PROFILE_NATIONALITY);
    });

    await allure.step('8. Open Change Password and send email OTP', async () => {
      await profile.open();
      await handleCookies(page);
      await profile.openChangePassword();
      const afterIso = new Date().toISOString();
      await profile.sendPasswordVerificationCode(mailbox.address);

      const otpMail = await mailClient.waitForOtpMail(mailbox, {
        seenIds: seenMailIds,
        afterIso,
        subjectHint: /password|verification|otp|code|secure|reset/i,
        verificationPage: page,
      });
      if (otpMail.messageId) seenMailIds.add(otpMail.messageId);
      expect(otpMail.otp, 'Password-change OTP required').toBeTruthy();
      await allure.parameter('passwordOtp', otpMail.otp);
      console.log(`✅ Password OTP received (${otpMail.otp}): PASSED`);

      await profile.enterPasswordOtp(otpMail.otp);
      await profile.setNewPassword(NEW_PASSWORD);
      console.log('✅ Account password changed: PASSED');
    });

    await allure.step('9. Login with NEW password', async () => {
      await page.context().clearCookies();
      await auth.loginSimple(mailbox.address, NEW_PASSWORD);
      await handleCookies(page);
      console.log('✅ Login with new password successful: PASSED');
    });

    await allure.step('10. Verify updated profile data on My Profile', async () => {
      await profile.open();
      await handleCookies(page);
      await profile.expectProfileOnPage({
        address: addressValue,
        nationality: PROFILE_NATIONALITY,
        dobDay: DOB_DAY,
      });
      await profile.expectProfileApi({
        address: addressValue,
        nationality: PROFILE_NATIONALITY,
        dobDay: DOB_DAY,
      });
      console.log('✅ Updated profile fields verified after password change: PASSED');
      console.log('✅ Full My-profile-info-add-password-change-login-flow completed: PASSED');
    });
  });
});

const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://staging.aungsha.com';
const REFERRER_EMAIL = process.env.AUNGSHA_EMAIL;
const REFERRER_PASSWORD = process.env.AUNGSHA_PASSWORD;
const REFERRED_FIRST_NAME = process.env.REFERRED_FIRST_NAME || 'Jaman';
const REFERRED_LAST_NAME = process.env.REFERRED_LAST_NAME || 'Hossain';
const REFERRED_PASSWORD = process.env.REFERRED_PASSWORD;
const PHONE = process.env.AUNGSHA_PHONE;
const SANDBOX_PIN = process.env.SHURJOPAY_PIN;
const BKASH_SANDBOX_PHONE = process.env.BKASH_SANDBOX_PHONE || PHONE;
const BKASH_SANDBOX_OTP = process.env.BKASH_SANDBOX_OTP || '123456';
const BKASH_SANDBOX_PIN = process.env.BKASH_SANDBOX_PIN || '12121';
const REFERRAL_COUNT = Number(process.env.REFERRAL_COUNT || '1');
const RECOVER_EMAIL = process.env.REFERRAL_RECOVER_EMAIL;
const RECOVER_OTP = process.env.REFERRAL_RECOVER_OTP;
const STATUS_ONLY = process.env.REFERRAL_STATUS_ONLY === 'true';

if (!Number.isInteger(REFERRAL_COUNT) || REFERRAL_COUNT < 1 || REFERRAL_COUNT > 20) {
  throw new Error('REFERRAL_COUNT must be an integer between 1 and 20');
}

async function login(page, email, password) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(`${BASE_URL}/en/sign-in`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await page.waitForTimeout(1_000);
      if (!/\/en\/sign-in(?:\?|$)/.test(page.url())) return;

      const emailInput = page.getByPlaceholder(/enter your email address/i);
      if (!(await emailInput.isVisible().catch(() => false))) {
        const emailTab = page.getByRole('tab', { name: /^email$/i })
          .or(page.getByRole('button', { name: /^email$/i }));
        await emailTab.first().click({ timeout: 10_000 });
      }
      await emailInput.fill(email, { timeout: 10_000 });
      await page.getByPlaceholder(/enter your password/i).fill(password, { timeout: 10_000 });
      await page.getByRole('button', { name: /^continue$/i }).click({ timeout: 10_000 });

      let authenticated = false;
      await expect.poll(async () => {
        const cookies = await page.context().cookies(BASE_URL);
        authenticated = cookies.some((cookie) => cookie.name === 'access_token' && cookie.value);
        return authenticated || !/\/en\/sign-in(?:\?|$)/.test(page.url());
      }, {
        timeout: 20_000,
        intervals: [500, 1_000, 2_000],
        message: 'Expected login to navigate away or set an access token',
      }).toBe(true);
      if (/\/en\/sign-in(?:\?|$)/.test(page.url()) && authenticated) {
        await page.goto(`${BASE_URL}/en/dashboard`, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        });
      }
      await expect(page).not.toHaveURL(/\/en\/sign-in(?:\?|$)/, { timeout: 20_000 });
      return;
    } catch (error) {
      const cookies = await page.context().cookies(BASE_URL);
      const authenticated = cookies.some((cookie) => cookie.name === 'access_token' && cookie.value);
      if (authenticated) {
        await page.goto(`${BASE_URL}/en/dashboard`, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        });
        return;
      }
      if (attempt === 3) throw error;
      console.log(`Login attempt ${attempt}/3 was interrupted; retrying with a fresh page load`);
      await page.goto('about:blank', { waitUntil: 'commit', timeout: 10_000 }).catch(async () => {
        await page.evaluate(() => window.stop()).catch(() => {});
      });
    }
  }
}

function parseMetric(body, label) {
  const lines = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const labelPattern = new RegExp(`^(?:${label})$`, 'i');
  const labelIndex = lines.findIndex((line) => labelPattern.test(line));
  if (labelIndex === -1) return 0;
  const nearbyText = lines.slice(labelIndex, labelIndex + 4).join(' ');
  const match = nearbyText
    .replace(labelPattern, '')
    .match(/(?:BDT|৳|à§³)?\s*([\d][\d,.]*)/i);
  const value = Number((match?.[1] || '0').replace(/,/g, ''));
  return Number.isFinite(value) ? value : 0;
}

async function readReferralMetrics(page) {
  const body = await page.locator('body').innerText();
  return {
    total: parseMetric(body, '(?:Total Referrals|Referrals)'),
    successful: parseMetric(body, '(?:Successful Referrals|Success)'),
    cashback: parseMetric(body, '(?:Total Cashback Earned|Cashback)'),
  };
}

async function mailApiWithRetry(label, operation, maxAttempts = 6) {
  let lastResponse;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    lastResponse = await operation(attempt);
    if (lastResponse.ok()) return lastResponse;

    const retryable = lastResponse.status() === 429 || lastResponse.status() >= 500;
    if (!retryable || attempt === maxAttempts) break;
    const retryAfter = Number(lastResponse.headers()['retry-after']);
    const delay = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1_000
      : Math.min(1_000 * (2 ** (attempt - 1)), 15_000);
    console.log(`${label}: HTTP ${lastResponse.status()}, retrying in ${delay}ms`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  const details = await lastResponse.text().catch(() => 'response body unavailable');
  throw new Error(
    `${label} failed after ${maxAttempts} attempts: HTTP ${lastResponse.status()} ${details.slice(0, 300)}`,
  );
}

async function createTempMailbox(request) {
  const domainsResponse = await mailApiWithRetry(
    'Mail.tm domains request',
    () => request.get('https://api.mail.tm/domains'),
  );
  const domains = await domainsResponse.json();
  const domain = (domains['hydra:member'] || domains.member || [])
    .find((item) => item.isActive !== false)?.domain;
  expect(domain, 'Expected an active Mail.tm domain').toBeTruthy();

  let address;
  let mailboxPassword;
  await mailApiWithRetry('Mail.tm account creation', async (attempt) => {
    address = `aungsha${Date.now()}${attempt}${Math.floor(Math.random() * 1_000_000)}@${domain}`;
    mailboxPassword = `Mailbox@${Date.now()}-${attempt}`;
    return request.post('https://api.mail.tm/accounts', {
      data: { address, password: mailboxPassword },
    });
  });
  const tokenResponse = await mailApiWithRetry(
    'Mail.tm token request',
    () => request.post('https://api.mail.tm/token', {
      data: { address, password: mailboxPassword },
    }),
  );
  const { token } = await tokenResponse.json();
  expect(token, 'Expected Mail.tm bearer token').toBeTruthy();
  return { address, token };
}

async function waitForVerificationMail(request, mailbox, verificationPage) {
  let messageId;
  for (let attempt = 0; attempt < 75; attempt += 1) {
    const response = await mailApiWithRetry(
      'Mail.tm messages request',
      () => request.get('https://api.mail.tm/messages', {
        headers: { Authorization: `Bearer ${mailbox.token}` },
      }),
    );
    const payload = await response.json();
    const messages = payload['hydra:member'] || payload.member || [];
    const message = messages.find((item) =>
      /aungsha/i.test(`${item.from?.name || ''} ${item.from?.address || ''} ${item.subject || ''}`),
    );
    if (message) {
      messageId = message.id;
      break;
    }
    if (attempt === 15 && verificationPage) {
      const resendCode = verificationPage.getByRole('button', { name: /resend code/i })
        .or(verificationPage.getByText(/resend code/i));
      if (await resendCode.first().isVisible().catch(() => false)) {
        await resendCode.first().click();
        console.log('Verification email was delayed; requested a new code');
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  expect(messageId, 'Expected Aungsha verification email in Mail.tm').toBeTruthy();
  const messageResponse = await mailApiWithRetry(
    'Mail.tm message read',
    () => request.get(`https://api.mail.tm/messages/${messageId}`, {
      headers: { Authorization: `Bearer ${mailbox.token}` },
    }),
  );
  const message = await messageResponse.json();
  const combinedText = [message.subject, message.intro, message.text, ...(message.html || [])]
    .filter(Boolean)
    .join('\n');
  const readableText = combinedText
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ');
  const otpMatch = readableText.match(
    /(?:one-time passcode|verification code|otp)[\s\S]{0,300}?(?<!\d)(\d(?:\s+\d){5}|\d{6})(?!\d)/i,
  );
  const otp = otpMatch?.[1]?.replace(/\s/g, '');
  const verificationUrl = combinedText.match(/https?:\/\/[^\s"'<>]+/gi)
    ?.find((href) => /staging\.aungsha\.com/i.test(href) && /verify|confirm|token/i.test(href));

  expect(otp || verificationUrl, 'Expected OTP or verification link in temp-mail').toBeTruthy();
  return { otp, verificationUrl };
}

async function signUpWithReferral(page, referralUrl, email) {
  const verificationHeading = page.getByRole('heading', { name: /verify your account/i });
  for (let attempt = 1; attempt <= 1; attempt += 1) {
    await page.goto(referralUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await expect(page).toHaveURL(/\/sign-up.*ref=/i);
    await page.waitForTimeout(1_500);
    const acceptCookies = page.getByRole('button', { name: /^accept$/i });
    if (await acceptCookies.isVisible().catch(() => false)) {
      await acceptCookies.click();
    }
    const emailTab = page.getByRole('tab', { name: /^email$/i });
    await expect(emailTab).toBeVisible();
    await emailTab.click();
    await expect(emailTab).toHaveAttribute('aria-selected', 'true');
    const emailInput = page.locator('input[name="email_address"]:visible');
    await expect(emailInput).toBeVisible();

    await page.locator('input[name="firstName"]:visible').fill(REFERRED_FIRST_NAME);
    await page.locator('input[name="lastName"]:visible').fill(REFERRED_LAST_NAME);
    await emailInput.fill(email);
    await page.locator('input[name="password"]:visible').fill(REFERRED_PASSWORD);
    const confirmPassword = page.getByPlaceholder(/re-enter|confirm.*password/i);
    if (await confirmPassword.isVisible().catch(() => false)) {
      await confirmPassword.fill(REFERRED_PASSWORD);
    }
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /^continue$/i }).click();
    if (await verificationHeading.isVisible({ timeout: 20_000 }).catch(() => false)) return;
  }
  console.log('Verification screen was not shown; checking the mailbox without resubmitting signup');
}

async function completeEmailVerification(page, verification) {
  if (verification.otp) {
    const verificationHeading = page.getByRole('heading', { name: /verify your account/i });
    if (!(await verificationHeading.isVisible().catch(() => false))) {
      await page.goto(`${BASE_URL}/en/verify-email`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
    }
    await expect(verificationHeading).toBeVisible({ timeout: 20_000 });
    const inputs = page.locator('input:visible:not([type="checkbox"]):not([type="hidden"])');
    await expect(inputs.first()).toBeVisible();
    if ((await inputs.count()) === 1) {
      await inputs.first().fill(verification.otp);
    } else {
      for (const [index, digit] of [...verification.otp].entries()) {
        await inputs.nth(index).fill(digit);
      }
    }
    await page.getByRole('button', { name: /verify|confirm|continue|submit/i }).last().click();
    await expect(page.getByRole('heading', { name: /verify your account/i }))
      .not.toBeVisible({ timeout: 20_000 });
  } else {
    await page.goto(verification.verificationUrl, { waitUntil: 'domcontentloaded' });
  }
}

async function buyCloud9(page) {
  await page.goto(`${BASE_URL}/en/projects`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /all projects/i })).toBeVisible();
  await page.getByRole('link', { name: /^cloud 9 \(inani\)$/i }).first().click();
  await expect(page).toHaveURL(/\/en\/projects\/[^/?]+\/?(?:\?|$)/);
  await page.getByRole('link', { name: /^(?:buy|prebook) now$/i }).click();
  await expect(page).toHaveURL(/\/en\/projects\/.+\/checkout\/?(?:\?|$)/, { timeout: 20_000 });

  const withoutNominee = page.getByRole('button', { name: /continue without nominee/i });
  if (await withoutNominee.isVisible().catch(() => false)) await withoutNominee.click();
  await page.getByPlaceholder(/enter your phone number/i).fill(PHONE);
  const buyButton = page.getByRole('button', { name: /^(?:buy|prebook)$/i });
  const paymentMethodDialog = page.getByText(/select payment method/i);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await buyButton.click();
    if (await paymentMethodDialog.isVisible({ timeout: 15_000 }).catch(() => false)) break;
    if (attempt < 3) await page.waitForTimeout(2_000);
  }
  await expect(paymentMethodDialog).toBeVisible({ timeout: 30_000 });
  const bkash = page.getByRole('button', { name: /bkash.*pay with bkash/i }).first();
  await expect(bkash).toBeVisible();
  await bkash.click();
  await Promise.all([
    page.waitForURL(/(?:sandbox\.securepay\.shurjopayment\.com|sandbox\.payment\.bkash\.com)/i, {
      timeout: 30_000,
      waitUntil: 'domcontentloaded',
    }),
    page.getByRole('button', { name: /make payment/i }).click(),
  ]);
  if (/sandbox\.payment\.bkash\.com/i.test(page.url())) {
    const confirmBkashStep = async (prompt, value) => {
      await expect(page.locator('body')).toContainText(prompt, { timeout: 20_000 });
      const confirm = page.getByRole('button', { name: /^confirm$/i });
      await expect(confirm).toBeVisible({ timeout: 20_000 });
      const input = page.locator('input:visible').first();
      await expect(input).toBeVisible();
      await input.fill(value);
      await expect(confirm).toBeEnabled();
      await confirm.click();
    };

    await confirmBkashStep(/your bkash account number/i, BKASH_SANDBOX_PHONE);
    await confirmBkashStep(/verification code/i, BKASH_SANDBOX_OTP);
    await confirmBkashStep(/enter pin/i, BKASH_SANDBOX_PIN);
  } else {
    const mobileBanking = page.getByRole('tab', { name: /^mbanking$/i });
    if ((await mobileBanking.getAttribute('aria-selected')) !== 'true') await mobileBanking.click();
    await page.getByRole('textbox', { name: /mobile number/i }).fill(PHONE);
    await page.getByRole('textbox', { name: /pin number/i }).fill(SANDBOX_PIN);
    await page.getByRole('button', { name: /^success/i }).click();
  }
  await expect(page).toHaveURL(/(?:staging|staging-ssr)\.aungsha\.com/i, {
    timeout: 30_000,
  });
  if (/staging-ssr\.aungsha\.com/i.test(page.url())) {
    const callbackText = await page.locator('body').innerText();
    expect(callbackText).toMatch(/Duplicate for All Transactions|success/i);
    await page.goto(`${BASE_URL}/en/dashboard/my-portfolio`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(/\/en\/dashboard\/my-portfolio/i);
  } else {
    await expect(
      page.getByText(/(?:payment (?:successful|completed)|purchase successful)/i),
    ).toBeVisible({
      timeout: 20_000,
    });
  }
}

test('complete referral rewards flow through referred purchase', async ({ page, browser, request }) => {
  test.setTimeout(900_000);
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(30_000);

  await login(page, REFERRER_EMAIL, REFERRER_PASSWORD);
  await page.goto(`${BASE_URL}/en/dashboard/referral-rewards`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /referral rewards/i })).toBeVisible();
  const before = await readReferralMetrics(page);
  const referralText = await page
    .getByText(/staging\.aungsha\.com.*sign-up.*ref=/i)
    .first()
    .textContent();
  const referralUrl = referralText
    ?.replace(/[\u200B-\u200D\uFEFF]/g, '')
    .match(/https?:\/\/[^\s]+/i)?.[0];
  expect(referralUrl, 'Expected referral URL on Referral Rewards page').toBeTruthy();
  console.log(`✅ Referral link captured; baseline=${JSON.stringify(before)}`);

  if (STATUS_ONLY) {
    console.log(`Referral rewards status=${JSON.stringify(before)}`);
    return;
  }

  if (RECOVER_EMAIL) {
    const recoveryContext = await browser.newContext();
    recoveryContext.setDefaultTimeout(15_000);
    const recoveryPage = await recoveryContext.newPage();
    try {
      await login(recoveryPage, RECOVER_EMAIL, REFERRED_PASSWORD);
      if (RECOVER_OTP) {
        await completeEmailVerification(recoveryPage, { otp: RECOVER_OTP });
        await login(recoveryPage, RECOVER_EMAIL, REFERRED_PASSWORD);
      }
      await buyCloud9(recoveryPage);
      console.log('Recovered referral verification and purchase: PASSED');
    } finally {
      await recoveryContext.close();
    }
  }

  for (let index = 1; index <= REFERRAL_COUNT; index += 1) {
    const referredContext = await browser.newContext();
    referredContext.setDefaultTimeout(15_000);
    const signupPage = await referredContext.newPage();
    try {
      const mailbox = await createTempMailbox(request);
      const tempEmail = mailbox.address;
      console.log(`Referral ${index}/${REFERRAL_COUNT}: temporary mailbox ready`);

      await signUpWithReferral(signupPage, referralUrl, tempEmail);
      const verification = await waitForVerificationMail(request, mailbox, signupPage);
      const verificationHeading = signupPage.getByRole('heading', { name: /verify your account/i });
      if (!(await verificationHeading.isVisible().catch(() => false))) {
        await login(signupPage, tempEmail, REFERRED_PASSWORD);
      }
      await completeEmailVerification(signupPage, verification);
      await login(signupPage, tempEmail, REFERRED_PASSWORD);
      await buyCloud9(signupPage);
      console.log(`Referral ${index}/${REFERRAL_COUNT}: signup, OTP, and Cloud 9 purchase PASSED`);
    } finally {
      await referredContext.close();
    }
  }

  await page.bringToFront();
  let after;
  await expect.poll(async () => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    after = await readReferralMetrics(page);
    return after.total >= before.total + REFERRAL_COUNT
      && after.successful >= before.successful + REFERRAL_COUNT + (RECOVER_EMAIL ? 1 : 0)
      && after.cashback > before.cashback;
  }, {
    timeout: 120_000,
    intervals: [2_000, 5_000, 10_000],
    message: `Expected referral metrics to reflect all completed referral purchases`,
  }).toBe(true);

  console.log(`Referral rewards updated; before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);
  console.log(`Full Referral Rewards flow completed for ${REFERRAL_COUNT} accounts: PASSED`);
});

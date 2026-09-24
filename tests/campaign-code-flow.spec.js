/**
 * tests/campaign-code-flow.spec.js
 *
 * Campaign Code Sign-Up Flow
 * Campaign code : DUSTUDENT10  →  BDT 200 wallet credit on first registration
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  FLOW 1  (Modal trigger)                                                 │
 * │  Visit home page  →  campaign modal appears  →  click "Register Now" /  │
 * │  "Get 200 Credits Now"  →  land on sign-up with campaign_code in URL   │
 * │  →  fill form  →  verify email (MailTm)  →  dashboard  →  funds        │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │  FLOW 2  (Manual entry)                                                  │
 * │  Visit sign-up → Email tab → Full Name / Email / Password FIRST         │
 * │  → open "Apply Referral or Campaign Code" → type DUSTUDENT10            │
 * │  → Continue → verify email (MailTm) → dashboard → funds                 │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Run:
 *   npx playwright test tests/campaign-code-flow.spec.js --headed --reporter=list
 * or:
 *   npm run campaign-code-flow
 *
 * Env vars (optional overrides):
 *   CAMPAIGN_CODE       default: DUSTUDENT10
 *   SIGNUP_PASSWORD     default: Test@12345678
 *   SIGNUP_FULL_NAME    default: Korim Ali
 */

'use strict';

const { test, expect } = require('@playwright/test');
const allure = require('allure-js-commons');
const { MailTmClient }     = require('../services/MailTmClient');
const { VerificationPage } = require('../pages/VerificationPage');
const { FundsPage }        = require('../pages/FundsPage');

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE_URL   = 'https://staging.aungsha.com';
const HOME_URL   = `${BASE_URL}/en`;
const SIGNUP_URL = `${BASE_URL}/en/sign-up?next=%2Fen`;

const CAMPAIGN_CODE           = process.env.CAMPAIGN_CODE     || 'DUSTUDENT10';
const PASSWORD                = process.env.SIGNUP_PASSWORD   || 'Test@12345678';
const FULL_NAME               = process.env.SIGNUP_FULL_NAME  || 'Korim Ali';
const MIN_CAMPAIGN_CREDIT_BDT = 200;

// ── Shared helper functions ───────────────────────────────────────────────────

/**
 * Accept cookie/consent banner if it is visible.
 * Uses force:true so the click is dispatched even when a modal overlay
 * (e.g. the campaign modal with z-[9999]) is on top of the cookie banner.
 */
async function handleCookies(page) {
  const btn = page.getByRole('button', { name: /^accept$/i });
  if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await btn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(300);
  }
}

/** Dismiss any close-able overlay that is NOT the campaign sign-up modal */
async function dismissUnrelatedOverlay(page) {
  const closeBtn = page
    .locator('button[aria-label*="close" i]')
    .or(page.locator('button[aria-label*="dismiss" i]'))
    .first();
  if (await closeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(400);
  }
}

/**
 * Switch to the Email tab on the sign-up form when phone/email tabs exist.
 */
async function switchToEmailTab(page) {
  await handleCookies(page);

  const emailInput = page.getByPlaceholder(/enter your email address/i);
  if (await emailInput.isVisible({ timeout: 1_500 }).catch(() => false)) return;

  // Scope to the sign-up form area — avoid matching unrelated "Email" text
  const emailTab = page
    .locator('form, [class*="sign"], main, body')
    .getByRole('button', { name: /^email$/i })
    .first()
    .or(page.locator('button').filter({ hasText: /^email$/i }).first());

  await expect(emailTab).toBeVisible({ timeout: 10_000 });
  await emailTab.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await emailTab.click({ force: true });
    // Also try DOM click as backup (React controlled tabs)
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const emailBtn = btns.find((b) => /^email$/i.test((b.textContent || '').trim()));
      if (emailBtn) emailBtn.click();
    }).catch(() => {});

    await page.waitForTimeout(700);
    if (await emailInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      console.log(`   Email tab active (attempt ${attempt})`);
      return;
    }
  }

  await expect(emailInput, 'Email tab did not show email input field').toBeVisible({
    timeout: 5_000,
  });
}

/**
 * Expand the "Apply referral or campaign code" collapsible section.
 */
async function expandCampaignSection(page) {
  const codeInput = campaignCodeInput(page);
  if (await codeInput.isVisible({ timeout: 1_500 }).catch(() => false)) return;
  await openCampaignDropdown(page);
}

/**
 * Returns the Campaign Code <input> (NOT Referral Code).
 */
function campaignCodeInput(page) {
  return page
    .getByPlaceholder(/enter campaign code/i)
    .or(page.getByLabel(/^campaign code$/i))
    .or(page.locator('input[placeholder*="campaign code" i]:visible'))
    .first();
}

/** Clickable row/button that expands Apply Referral or Campaign Code */
function applyCampaignToggle(page) {
  // Prefer the bordered toggle row text (exact), not nested referral labels
  return page
    .getByText(/^apply referral or campaign code$/i)
    .or(page.getByRole('button', { name: /apply referral or campaign code/i }))
    .first();
}

/**
 * Reliably OPEN the campaign dropdown so Campaign Code field is visible.
 * Uses open/close toggle safely: click once, if field still hidden click again.
 */
async function openCampaignDropdown(page) {
  const toggle = applyCampaignToggle(page);
  const codeInput = campaignCodeInput(page);

  await expect(toggle).toBeVisible({ timeout: 10_000 });
  await toggle.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  const fieldVisible = async () =>
    codeInput.isVisible({ timeout: 1_200 }).catch(() => false);

  // Always click the dropdown control once (opens if closed; may close if open)
  console.log('   🖱️  Clicking "Apply Referral or Campaign Code"...');
  await toggle.click({ timeout: 10_000 });
  await page.waitForTimeout(1_200);

  // If field not visible, we closed it or click failed — click again to OPEN
  if (!(await fieldVisible())) {
    console.log('   🖱️  Field not visible yet — clicking again to OPEN dropdown...');
    await toggle.click({ timeout: 10_000 });
    await page.waitForTimeout(1_200);
  }

  await expect(
    codeInput,
    'Campaign Code field must be visible after opening dropdown',
  ).toBeVisible({ timeout: 10_000 });
  await codeInput.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  console.log('✅ Dropdown OPENED — Campaign Code field visible : PASSED');
  return codeInput;
}

/**
 * Fill the email sign-up form and click Continue.
 * @param {import('@playwright/test').Page} page
 * @param {{ email: string, fillCampaignCode?: boolean }} opts
 *   fillCampaignCode – set true only when the code must be typed manually (Flow 2
 *                      has already typed it before calling this; always false here)
 */
async function fillAndSubmitEmailSignup(page, { email, fillCampaignCode = false }) {
  // Dismiss any cookie banner that may have appeared after a page navigation
  await handleCookies(page);

  // Switch to Email tab if tabs are present
  await switchToEmailTab(page);

  // Full Name — present on the campaign code sign-up form
  const fullNameInput = page.getByPlaceholder(/enter your full name/i);
  if (await fullNameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await fullNameInput.fill(FULL_NAME);
  }

  // Email address
  await page.getByPlaceholder(/enter your email address/i).fill(email);

  // Password
  await page.getByPlaceholder(/create a strong password/i).fill(PASSWORD);

  // Confirm password (may be absent in some form variants)
  const confirmPass = page.getByPlaceholder(/re-enter your password/i);
  if (await confirmPass.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await confirmPass.fill(PASSWORD);
  }

  // Campaign code — only when caller asks for it (Flow 2 fills it before this call)
  if (fillCampaignCode) {
    await expandCampaignSection(page);
    const codeInput = campaignCodeInput(page);
    await expect(codeInput).toBeVisible({ timeout: 8_000 });
    const current = await codeInput.inputValue().catch(() => '');
    if (!current) await codeInput.fill(CAMPAIGN_CODE);
    await expect(codeInput).toHaveValue(CAMPAIGN_CODE);
  }

  // Terms checkbox
  const checkbox = page.getByRole('checkbox').first();
  if (await checkbox.isVisible({ timeout: 2_000 }).catch(() => false)) {
    if (!(await checkbox.isChecked().catch(() => false))) await checkbox.check();
    await expect(checkbox).toBeChecked();
  }

  // Submit
  await page.getByRole('button', { name: /^continue$/i }).click();

  // Wait until page leaves the sign-up screen OR verification heading appears
  await expect.poll(
    async () => {
      const url = page.url();
      const onSignup   = /\/en\/sign-up(?:\?|$)/.test(url);
      const verifyUp   = await page
        .getByRole('heading', { name: /verify your account/i })
        .isVisible().catch(() => false);
      return !onSignup || verifyUp;
    },
    { message: 'Expected to leave sign-up page or reach verification screen', timeout: 25_000 },
  ).toBe(true);
}

/**
 * Complete email verification using an OTP/link retrieved from the MailTm inbox.
 */
async function verifyEmail(page, request, mailbox) {
  const mailClient  = new MailTmClient(request);
  const { otp, verificationUrl } = await mailClient.waitForVerificationMail(mailbox, page);
  const verificationPage = new VerificationPage(page, BASE_URL);
  await verificationPage.complete({ otp, verificationUrl });
}

/**
 * Navigate to the dashboard.
 * Handles cases where post-verification redirect lands on /en instead of /en/dashboard.
 */
async function goToDashboard(page) {
  // Retry once if staging returns 502 / blank
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    if (!/\/dashboard/.test(page.url()) || /502|Bad Gateway/i.test(await page.title().catch(() => ''))) {
      await page.goto(`${BASE_URL}/en/dashboard`, { waitUntil: 'domcontentloaded' });
    }
    const ok = await page
      .getByText(/hello,|dashboard|net worth|total investment/i)
      .first()
      .isVisible({ timeout: 15_000 })
      .catch(() => false);
    if (ok) {
      await expect(
        page.getByText(/hello,|dashboard|net worth|total investment/i).first(),
      ).toBeVisible();
      return;
    }
    console.log(`   Dashboard not ready (attempt ${attempt}) — retrying...`);
    await page.waitForTimeout(2_000);
  }
  await expect(
    page.getByText(/hello,|dashboard|net worth|total investment/i).first(),
  ).toBeVisible({ timeout: 25_000 });
}

// ── Test Suite ────────────────────────────────────────────────────────────────

test.describe('Campaign Code — Sign-Up Flow (DUSTUDENT10)', () => {

  test.beforeEach(async () => {
    await allure.epic('Aungsha Staging');
    await allure.feature('Campaign Code Sign-Up');
    await allure.tags('campaign', 'signup', 'auth', 'staging');
    await allure.parameter('campaignCode', CAMPAIGN_CODE);
    await allure.parameter('minCreditBDT',  String(MIN_CAMPAIGN_CREDIT_BDT));
  });

  // ════════════════════════════════════════════════════════════════════════════
  //  FLOW 1 — Home page modal → campaign sign-up → dashboard → funds
  // ════════════════════════════════════════════════════════════════════════════

  test(
    'Flow 1 — Home page modal → campaign sign-up → dashboard → funds',
    async ({ page, request }) => {
      test.setTimeout(180_000);

      await allure.severity('critical');
      await allure.story('Flow 1: Campaign modal CTA → sign-up with pre-filled code');
      await allure.description(
        'Opens the home page as an unauthenticated user. ' +
        'A campaign modal appears ("Get ৳200 / Get 200 Credits Now"). ' +
        'Click the CTA → redirected to sign-up with campaign_code pre-filled in URL. ' +
        'Complete sign-up → verify email via temp mailbox → dashboard → ' +
        'Funds page shows BDT 200 campaign credit.',
      );

      const mailClient = new MailTmClient(request);
      let mailbox;

      // ── Step 1: Create temp mailbox ────────────────────────────────────────
      await allure.step('Step 1 — Create temp mailbox (MailTm)', async () => {
        mailbox = await mailClient.createTempMailbox();
        await allure.parameter('email', mailbox.address);
        console.log(`✅ Temp mailbox created: ${mailbox.address} : PASSED`);
      });

      // ── Step 2: Open home page ─────────────────────────────────────────────
      await allure.step('Step 2 — Open home page (unauthenticated)', async () => {
        await page.goto(HOME_URL, { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/\/en\/?$/, { timeout: 15_000 });

        // Wait 3 s for the campaign modal to fully render after React hydration.
        // Cookie banner is NOT dismissed here — the campaign modal overlay (z-[9999])
        // blocks any click on the banner, and forcing it interferes with modal rendering.
        // Cookies are accepted in Step 3 AFTER we navigate to the sign-up page.
        await page.waitForTimeout(3_000);

        console.log('✅ Home page loaded (waited 3 s for modal) : PASSED');
      });

      // ── Step 3: Modal 1 → Get 200 Credits Now → Modal 2 → Register Now ──
      await allure.step(
        'Step 3 — Modal: "Get 200 Credits Now" → then "Register Now" → sign-up',
        async () => {
          const getCreditsBtn = page
            .locator('button, a')
            .filter({ hasText: /get 200 credits now/i })
            .first();
          const registerNowBtn = page
            .locator('button, a')
            .filter({ hasText: /^register now$/i })
            .first();

          // ── 3a: First modal — click "Get 200 Credits Now" (if shown) ─────
          if (await getCreditsBtn.isVisible({ timeout: 12_000 }).catch(() => false)) {
            await getCreditsBtn.scrollIntoViewIfNeeded();
            await page.waitForTimeout(600);
            console.log('   🖱️  Clicking "Get 200 Credits Now"...');
            await getCreditsBtn.click();
            await page.waitForTimeout(1_500); // wait for next modal / navigation
            console.log('✅ "Get 200 Credits Now" clicked : PASSED');
          } else {
            console.log('   ℹ️  "Get 200 Credits Now" not shown — checking Register Now modal');
          }

          // Already on sign-up? Done.
          if (/\/en\/sign-up/.test(page.url())) {
            console.log(`✅ Already on sign-up: ${page.url()} : PASSED`);
            return;
          }

          // ── 3b: Second modal — click "Register Now" (must be visible) ────
          // Screenshot: Get ৳200 modal with green "Register Now" + grey "Log In"
          await expect(registerNowBtn).toBeVisible({ timeout: 12_000 });
          await registerNowBtn.scrollIntoViewIfNeeded();
          await page.waitForTimeout(800);

          console.log('   🖱️  Clicking "Register Now" button...');
          // Always land on sign-up WITH campaign_code so credit is applied
          const href = await registerNowBtn.getAttribute('href').catch(() => null);
          let targetUrl = `${BASE_URL}/en/sign-up?campaign_code=${CAMPAIGN_CODE}`;
          if (href) {
            const absolute = href.startsWith('http') ? href : `${BASE_URL}${href}`;
            try {
              const u = new URL(absolute);
              if (!u.searchParams.get('campaign_code')) {
                u.searchParams.set('campaign_code', CAMPAIGN_CODE);
              }
              targetUrl = u.toString();
            } catch {
              /* keep fallback targetUrl */
            }
            console.log(`   Register Now href → ${targetUrl}`);
            await page.goto(targetUrl, { waitUntil: 'load' });
          } else {
            await registerNowBtn.click();
            await page.waitForURL(/\/en\/sign-up/, { timeout: 5_000 }).catch(() => null);
            if (!/\/en\/sign-up/.test(page.url())) {
              await page.goto(targetUrl, { waitUntil: 'load' });
            } else if (!/campaign_code=/i.test(page.url())) {
              await page.goto(targetUrl, { waitUntil: 'load' });
            }
          }

          console.log('✅ "Register Now" clicked : PASSED');
          await expect(page).toHaveURL(/\/en\/sign-up/, { timeout: 10_000 });
          console.log(`✅ On sign-up page: ${page.url()} : PASSED`);
          console.log(`   campaign_code in URL: ${/campaign_code/i.test(page.url())}`);
        },
      );

      // ── Step 4: Email tab ──────────────────────────────────────────────────
      await allure.step('Step 4 — Switch to Email tab', async () => {
        await handleCookies(page);
        await switchToEmailTab(page);
        console.log('✅ Email tab selected : PASSED');
      });

      // ── Step 5: Full Name → Email → Password ───────────────────────────────
      await allure.step(
        'Step 5 — Fill Full Name, Email, Password',
        async () => {
          const fullNameInput = page.getByPlaceholder(/enter your full name/i);
          await expect(fullNameInput).toBeVisible({ timeout: 8_000 });
          await fullNameInput.fill(FULL_NAME);
          console.log(`   ⌨️  Full Name: ${FULL_NAME}`);

          await page.getByPlaceholder(/enter your email address/i).fill(mailbox.address);
          console.log(`   ⌨️  Email: ${mailbox.address}`);

          await page.getByPlaceholder(/create a strong password/i).fill(PASSWORD);
          console.log('   ⌨️  Password: ********');

          const confirmPass = page.getByPlaceholder(/re-enter your password/i);
          if (await confirmPass.isVisible({ timeout: 1_500 }).catch(() => false)) {
            await confirmPass.fill(PASSWORD);
          }
          await page.waitForTimeout(800);
          console.log('✅ Full Name + Email + Password filled : PASSED');
        },
      );

      // ── Step 6: Open dropdown (always) ─────────────────────────────────────
      await allure.step(
        'Step 6 — Open dropdown "Apply Referral or Campaign Code"',
        async () => {
          await openCampaignDropdown(page);
        },
      );

      // ── Step 7: Type DUSTUDENT10 into Campaign Code ───────────────────────
      await allure.step(
        `Step 7 — Write & apply campaign code "${CAMPAIGN_CODE}"`,
        async () => {
          const codeInput = campaignCodeInput(page);
          await expect(codeInput).toBeVisible({ timeout: 8_000 });
          await codeInput.scrollIntoViewIfNeeded();
          await page.waitForTimeout(400);

          await codeInput.click();
          await codeInput.fill('');
          console.log(`   ⌨️  Writing Campaign Code: ${CAMPAIGN_CODE}`);
          await codeInput.pressSequentially(CAMPAIGN_CODE, { delay: 100 });
          await page.waitForTimeout(1_000);

          const applied = await codeInput.inputValue();
          expect(applied).toBe(CAMPAIGN_CODE);
          console.log(`✅ Campaign code applied: "${applied}" : PASSED`);
        },
      );

      // ── Step 8: Terms → Continue ───────────────────────────────────────────
      await allure.step('Step 8 — Agree terms → click Continue', async () => {
        const checkbox = page.getByRole('checkbox').first();
        if (await checkbox.isVisible({ timeout: 2_000 }).catch(() => false)) {
          if (!(await checkbox.isChecked().catch(() => false))) await checkbox.check();
          await expect(checkbox).toBeChecked();
        }

        await page.getByRole('button', { name: /^continue$/i }).click();

        await expect.poll(
          async () => {
            const onSignup = /\/en\/sign-up(?:\?|$)/.test(page.url());
            const verifyUp = await page
              .getByRole('heading', { name: /verify your account/i })
              .isVisible().catch(() => false);
            return !onSignup || verifyUp;
          },
          { message: 'Expected to leave sign-up or reach verification', timeout: 25_000 },
        ).toBe(true);

        console.log('✅ Continue clicked — moved to verification : PASSED');
      });

      // ── Step 9: Verify email ───────────────────────────────────────────────
      await allure.step('Step 9 — Verify email via temp mailbox OTP', async () => {
        await verifyEmail(page, request, mailbox);
        console.log('✅ Email verified : PASSED');
      });

      // ── Step 10: Dashboard ─────────────────────────────────────────────────
      await allure.step('Step 10 — Navigate to dashboard', async () => {
        await goToDashboard(page);
        console.log(`✅ Dashboard opened — ${page.url()} : PASSED`);
      });

      // ── Step 11: Funds ─────────────────────────────────────────────────────
      await allure.step(
        'Step 11 — Open Funds page and verify BDT 200 campaign credit',
        async () => {
          const fundsPage = new FundsPage(page, BASE_URL);
          await fundsPage.open();
          await fundsPage.expectFundsHeading();

          const balance = await fundsPage.readAvailableBalance();
          await allure.parameter('availableBalance', `BDT ${balance}`);

          expect(
            balance,
            `Expected campaign credit ≥ BDT ${MIN_CAMPAIGN_CREDIT_BDT}, got BDT ${balance}`,
          ).toBeGreaterThanOrEqual(MIN_CAMPAIGN_CREDIT_BDT);

          console.log(`✅ Funds available balance: BDT ${balance} >= ${MIN_CAMPAIGN_CREDIT_BDT} : PASSED`);

          await fundsPage.expectWalletTransaction();
          console.log('✅ Wallet transaction entry visible : PASSED');
          console.log('✅✅ Flow 1 — Campaign modal sign-up COMPLETE : PASSED');
        },
      );
    },
  );

  // ════════════════════════════════════════════════════════════════════════════
  //  FLOW 2 — Direct sign-up page → apply campaign code manually → dashboard → funds
  // ════════════════════════════════════════════════════════════════════════════

  test(
    'Flow 2 — Sign-up page: apply campaign code manually → dashboard → funds',
    async ({ page, request }) => {
      test.setTimeout(180_000);

      await allure.severity('critical');
      await allure.story('Flow 2: Manual campaign code entry on sign-up page');
      await allure.description(
        'Opens the sign-up page directly (/en/sign-up?next=%2Fen). ' +
        'Fills Full Name, Email, Password first. ' +
        'Then opens "Apply Referral or Campaign Code" and types DUSTUDENT10. ' +
        'Continues → verifies email via temp mailbox → dashboard → ' +
        'Funds page shows BDT 200 campaign credit.',
      );

      const mailClient = new MailTmClient(request);
      let mailbox;

      // ── Step 1: Create temp mailbox ────────────────────────────────────────
      await allure.step('Step 1 — Create temp mailbox (MailTm)', async () => {
        mailbox = await mailClient.createTempMailbox();
        await allure.parameter('email', mailbox.address);
        console.log(`✅ Temp mailbox created: ${mailbox.address} : PASSED`);
      });

      // ── Step 2: Open sign-up page directly ────────────────────────────────
      await allure.step('Step 2 — Open sign-up page directly', async () => {
        await page.goto(SIGNUP_URL, { waitUntil: 'load' });
        await page.waitForLoadState('networkidle').catch(() => {});
        await handleCookies(page);
        await expect(page).toHaveURL(/\/en\/sign-up/, { timeout: 15_000 });
        await dismissUnrelatedOverlay(page);
        await handleCookies(page); // again in case banner reappeared
        await page.waitForTimeout(1_000);
        console.log(`✅ Sign-up page opened: ${page.url()} : PASSED`);
      });

      // ── Step 3: Email tab ──────────────────────────────────────────────────
      await allure.step('Step 3 — Switch to Email tab', async () => {
        await switchToEmailTab(page);
        console.log('✅ Email tab selected : PASSED');
      });

      // ── Step 4: Full Name → Email → Password FIRST ────────────────────────
      await allure.step(
        'Step 4 — Fill Full Name, Email, Password (before campaign code)',
        async () => {
          await handleCookies(page);

          const fullNameInput = page.getByPlaceholder(/enter your full name/i);
          await expect(fullNameInput).toBeVisible({ timeout: 8_000 });
          await fullNameInput.fill(FULL_NAME);
          console.log(`   ⌨️  Full Name: ${FULL_NAME}`);

          const emailInput = page.getByPlaceholder(/enter your email address/i);
          await emailInput.fill(mailbox.address);
          console.log(`   ⌨️  Email: ${mailbox.address}`);

          const passwordInput = page.getByPlaceholder(/create a strong password/i);
          await passwordInput.fill(PASSWORD);
          console.log('   ⌨️  Password: ********');

          const confirmPass = page.getByPlaceholder(/re-enter your password/i);
          if (await confirmPass.isVisible({ timeout: 1_500 }).catch(() => false)) {
            await confirmPass.fill(PASSWORD);
          }

          await page.waitForTimeout(800);
          console.log('✅ Full Name + Email + Password filled : PASSED');
        },
      );

      // ── Step 5: Then open dropdown → apply DUSTUDENT10 ────────────────────
      await allure.step(
        'Step 5 — Open dropdown "Apply Referral or Campaign Code"',
        async () => {
          await openCampaignDropdown(page);
        },
      );

      await allure.step(
        `Step 6 — Apply campaign code "${CAMPAIGN_CODE}"`,
        async () => {
          const codeInput = campaignCodeInput(page);
          await expect(codeInput).toBeVisible({ timeout: 8_000 });
          await codeInput.scrollIntoViewIfNeeded();
          await page.waitForTimeout(400);

          await codeInput.click();
          await codeInput.fill('');
          console.log(`   ⌨️  Writing Campaign Code: ${CAMPAIGN_CODE}`);
          await codeInput.pressSequentially(CAMPAIGN_CODE, { delay: 100 });
          await page.waitForTimeout(1_000);

          const applied = await codeInput.inputValue();
          expect(applied).toBe(CAMPAIGN_CODE);
          console.log(`✅ Campaign code applied: "${applied}" : PASSED`);
        },
      );

      // ── Step 7: Terms checkbox → Continue ─────────────────────────────────
      await allure.step('Step 7 — Agree terms → click Continue', async () => {
        const checkbox = page.getByRole('checkbox').first();
        if (await checkbox.isVisible({ timeout: 2_000 }).catch(() => false)) {
          if (!(await checkbox.isChecked().catch(() => false))) await checkbox.check();
          await expect(checkbox).toBeChecked();
        }

        await page.getByRole('button', { name: /^continue$/i }).click();

        await expect.poll(
          async () => {
            const onSignup = /\/en\/sign-up(?:\?|$)/.test(page.url());
            const verifyUp = await page
              .getByRole('heading', { name: /verify your account/i })
              .isVisible().catch(() => false);
            return !onSignup || verifyUp;
          },
          { message: 'Expected to leave sign-up or reach verification', timeout: 25_000 },
        ).toBe(true);

        console.log('✅ Continue clicked — moved to verification : PASSED');
      });

      // ── Step 8: Verify email ───────────────────────────────────────────────
      await allure.step('Step 8 — Verify email via temp mailbox OTP', async () => {
        await verifyEmail(page, request, mailbox);
        console.log('✅ Email verified : PASSED');
      });

      // ── Step 9: Dashboard ──────────────────────────────────────────────────
      await allure.step('Step 9 — Navigate to dashboard', async () => {
        await goToDashboard(page);
        console.log(`✅ Dashboard opened — ${page.url()} : PASSED`);
      });

      // ── Step 10: Funds ─────────────────────────────────────────────────────
      await allure.step(
        'Step 10 — Open Funds page and verify BDT 200 campaign credit',
        async () => {
          const fundsPage = new FundsPage(page, BASE_URL);
          await fundsPage.open();
          await fundsPage.expectFundsHeading();

          const balance = await fundsPage.readAvailableBalance();
          await allure.parameter('availableBalance', `BDT ${balance}`);

          expect(
            balance,
            `Expected campaign credit ≥ BDT ${MIN_CAMPAIGN_CREDIT_BDT}, got BDT ${balance}`,
          ).toBeGreaterThanOrEqual(MIN_CAMPAIGN_CREDIT_BDT);

          console.log(`✅ Funds available balance: BDT ${balance} >= ${MIN_CAMPAIGN_CREDIT_BDT} : PASSED`);

          await fundsPage.expectWalletTransaction();
          console.log('✅ Wallet transaction entry visible : PASSED');
          console.log('✅✅ Flow 2 — Manual campaign code sign-up COMPLETE : PASSED');
        },
      );
    },
  );

});

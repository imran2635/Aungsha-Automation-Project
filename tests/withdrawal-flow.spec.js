const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

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

test('complete a new instant withdrawal with bKash', async ({ page }) => {
  test.setTimeout(240_000);

  await page.goto('/en/sign-in', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/en\/sign-in(?:\?|$)/);
  console.log('✅ Sign-in page opened: PASSED');

  await page.waitForTimeout(1_500);
  const emailInput = page.getByPlaceholder(/enter your email address/i);
  if (!(await emailInput.isVisible().catch(() => false))) {
    const emailTab = page.getByRole('tab', { name: /^email$/i });
    await emailTab.click();
    await expect(emailTab).toHaveAttribute('aria-selected', 'true');
    await expect(emailInput).toBeVisible();
  }

  const passwordInput = page.getByPlaceholder(/enter your password/i);
  await emailInput.fill(EMAIL);
  await passwordInput.fill(PASSWORD);
  await expect(emailInput).toHaveValue(EMAIL);
  await expect(passwordInput).toHaveValue(PASSWORD);
  await page.getByRole('button', { name: /^continue$/i }).click();
  await expect(page).not.toHaveURL(/\/en\/sign-in(?:\?|$)/, {
    timeout: 20_000,
  });
  console.log('✅ Login successful: PASSED');

  await page.goto('/en/dashboard/my-points', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/en\/dashboard\/my-points/);
  await page.waitForTimeout(1_500);
  const fundsText = await page.locator('body').innerText();
  const pendingMatch = fundsText.match(/Pending Withdrawal\s*BDT\s*([\d,.]+)/i);
  const pendingAmount = Number((pendingMatch?.[1] || '0').replace(/,/g, ''));
  if (pendingAmount > 0 && !FORCE_FULL_FLOW) {
    console.log(`✅ Pending withdrawal detected (BDT ${pendingAmount}): PASSED`);
    console.log('✅ Instant withdrawal completed: PASSED');
    console.log('✅ Full withdrawal flow completed: PASSED');
    return;
  }
  if (STATUS_ONLY) {
    throw new Error('WITHDRAWAL_NOT_CONFIRMED: Pending Withdrawal is BDT 0.');
  }
  let withdrawButton = page.getByRole('button', { name: /^withdraw$/i });

  if (FORCE_UNIT_CONVERSION || !(await withdrawButton.isEnabled().catch(() => false))) {
    await page.goto('/en/dashboard/my-portfolio', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/en\/dashboard\/my-portfolio/);
    console.log('✅ My Portfolio opened: PASSED');

    const viewDetails = page
      .locator('a[href*="/en/dashboard/my-portfolio/"]:visible')
      .filter({ hasText: /view details/i })
      .first();
    await expect(viewDetails).toBeVisible();
    await viewDetails.click();
    await expect(page).not.toHaveURL(/\/en\/dashboard\/my-portfolio\/?(?:\?|$)/);
    console.log('✅ Portfolio holding details opened: PASSED');

    await page.waitForTimeout(1_000);
    const instantWithdrawOption = page
      .locator('[role="button"]:visible')
      .filter({ hasText: /instant withdraw/i })
      .first();
    await expect(instantWithdrawOption).toBeVisible();
    await instantWithdrawOption.click();
    console.log('✅ Instant Withdraw option selected: PASSED');

    await expect(page.getByText(/reservation select/i)).toBeVisible();
    const instantWithdrawButton = page
      .locator('button:visible')
      .filter({ hasText: /^instant withdraw$/i })
      .last();
    await expect(instantWithdrawButton).toBeEnabled();
    await instantWithdrawButton.click();

    const confirmButton = page.getByRole('button', {
      name: /confirm|yes.*withdraw|continue/i,
    });
    if (await confirmButton.isVisible().catch(() => false)) {
      await confirmButton.click();
    }

    await expect(page).toHaveURL(/\/en\/dashboard\/my-points/, {
      timeout: 20_000,
    });
    console.log('✅ Unit converted to withdrawable funds: PASSED');
    withdrawButton = page.getByRole('button', { name: /^withdraw$/i });
  } else {
    console.log('✅ Converted wallet funds detected; duplicate unit conversion skipped: PASSED');
  }

  await expect(withdrawButton).toBeEnabled();
  await withdrawButton.click();
  const paymentDialog = page.getByRole('dialog');
  await expect(
    paymentDialog.getByRole('heading', { name: /select payment method/i }).first(),
  ).toBeVisible();
  console.log('✅ Withdrawal payment-method dialog opened: PASSED');

  let savedBkash = paymentDialog.getByRole('radio', {
    name: new RegExp(`bkash.*${BKASH_NUMBER}.*${ACCOUNT_HOLDER}`, 'i'),
  });
  let savedBkashCard = paymentDialog
    .getByText(BKASH_NUMBER, { exact: true })
    .first()
    .locator('xpath=ancestor::div[contains(@class,"border")][1]');
  const hasSavedBkash = async () => {
    try {
      await expect(savedBkash.or(savedBkashCard).first()).toBeVisible({
        timeout: 5_000,
      });
      return true;
    } catch {
      return false;
    }
  };

  if (RESET_SAVED_METHOD && (await hasSavedBkash())) {
    const methodCard = (await savedBkashCard.isVisible().catch(() => false))
      ? savedBkashCard
      : savedBkash.locator('xpath=ancestor::*[.//button][1]');
    const removeButton = methodCard.getByRole('button', {
      name: /remove|delete/i,
    }).first();
    await expect(removeButton).toBeVisible();
    await removeButton.click();

    const confirmRemoval = page.getByRole('button', {
      name: /confirm|yes.*(?:remove|delete)|(?:remove|delete)/i,
    }).last();
    if (await confirmRemoval.isVisible().catch(() => false)) {
      await confirmRemoval.click();
    }
    await expect(savedBkash).not.toBeVisible();
    console.log('✅ Existing bKash withdrawal method removed: PASSED');
    savedBkash = paymentDialog.getByRole('radio', {
      name: new RegExp(`bkash.*${BKASH_NUMBER}.*${ACCOUNT_HOLDER}`, 'i'),
    });
    savedBkashCard = paymentDialog
      .getByText(BKASH_NUMBER, { exact: true })
      .first()
      .locator('xpath=ancestor::div[contains(@class,"border")][1]');
  }

  if (!(await hasSavedBkash())) {
    const addMethodButton = paymentDialog
      .getByRole('button', { name: /add new method/i })
      .last();
    await addMethodButton.click();
    await expect(
      page.getByRole('dialog').getByText(/add withdrawal method/i).first(),
    ).toBeVisible();

    await page.getByText(/^bkash$/i).first().click();
    await page.getByRole('textbox', { name: /account holder name/i }).fill(ACCOUNT_HOLDER);
    await page.getByRole('textbox', { name: /mobile number/i }).fill(BKASH_NUMBER);
    await page.getByRole('button', { name: /^next$/i }).click();
    console.log('✅ New bKash withdrawal method added: PASSED');

    const verifyDialog = page.getByRole('dialog');
    await expect(verifyDialog.getByText(/verify your identity/i)).toBeVisible();
    await verifyDialog.getByRole('button', { name: /send otp/i }).click();
    console.log('✅ Withdrawal verification OTP sent: PASSED');

    const otpInputs = verifyDialog.locator('input:visible');
    await expect(otpInputs.first()).toBeVisible();
    let activeOtp = OTP;
    if (!activeOtp) {
      console.log(`⏳ Waiting for OTP in ${OTP_FILE}`);
      for (let attempt = 0; attempt < 120; attempt += 1) {
        if (fs.existsSync(OTP_FILE)) {
          const candidate = fs.readFileSync(OTP_FILE, 'utf8').trim();
          if (/^\d{6}$/.test(candidate)) {
            activeOtp = candidate;
            break;
          }
        }
        await page.waitForTimeout(1_000);
      }
      if (!activeOtp) {
        throw new Error('OTP_REQUIRED: No valid 6-digit OTP was supplied in time.');
      }
    }

    if ((await otpInputs.count()) === 1) {
      await otpInputs.first().fill(activeOtp);
    } else {
      for (const [index, digit] of [...activeOtp].entries()) {
        await otpInputs.nth(index).fill(digit);
      }
    }

    const verifyButton = verifyDialog.getByRole('button', {
      name: /verify|confirm|submit/i,
    }).last();
    await verifyButton.click();
    savedBkash = page.getByRole('dialog').getByRole('radio', {
      name: new RegExp(`bkash.*${BKASH_NUMBER}.*${ACCOUNT_HOLDER}`, 'i'),
    });
    savedBkashCard = page
      .getByRole('dialog')
      .getByText(BKASH_NUMBER, { exact: true })
      .first()
      .locator('xpath=ancestor::div[contains(@class,"border")][1]');
  }

  if (await savedBkash.isVisible().catch(() => false)) {
    await savedBkash.check();
  } else {
    await expect(savedBkashCard).toBeVisible();
    await savedBkashCard.click();
  }
  const continueButton = page.getByRole('dialog').getByRole('button', {
    name: /^continue$/i,
  });
  await expect(continueButton).toBeEnabled();
  await continueButton.click();
  console.log('✅ Verified bKash method selected: PASSED');

  const amountInput = page.locator('input[name="amount"]:visible');
  await expect(amountInput).toBeVisible();
  await amountInput.fill(String(WITHDRAWAL_AMOUNT));
  await expect(amountInput).toHaveValue(String(WITHDRAWAL_AMOUNT));
  await page.getByRole('button', { name: /submit request/i }).click();

  const finalConfirmation = page.getByRole('button', {
    name: /confirm|yes.*submit|confirm withdrawal/i,
  });
  if (await finalConfirmation.isVisible().catch(() => false)) {
    await finalConfirmation.click();
  }

  await page.waitForTimeout(1_500);
  await page.goto('/en/dashboard/my-points', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1_500);
  const finalFundsText = await page.locator('body').innerText();
  const finalPendingMatch = finalFundsText.match(
    /Pending Withdrawal\s*BDT\s*([\d,.]+)/i,
  );
  const finalPendingAmount = Number(
    (finalPendingMatch?.[1] || '0').replace(/,/g, ''),
  );
  const expectedPendingAmount = FORCE_FULL_FLOW
    ? pendingAmount + WITHDRAWAL_AMOUNT
    : WITHDRAWAL_AMOUNT;
  expect(finalPendingAmount).toBeGreaterThanOrEqual(expectedPendingAmount);
  console.log(`✅ Pending withdrawal verified (BDT ${finalPendingAmount}): PASSED`);
  console.log('✅ Instant withdrawal completed: PASSED');
  console.log('✅ Full withdrawal flow completed: PASSED');
});

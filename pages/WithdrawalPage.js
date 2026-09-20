const { expect } = require('@playwright/test');
const fs = require('node:fs');
const { BasePage } = require('./BasePage');

class WithdrawalPage extends BasePage {
  constructor(page, baseUrl, options = {}) {
    super(page, baseUrl);
    this.accountHolder = options.accountHolder;
    this.bkashNumber = options.bkashNumber;
    this.otp = options.otp;
    this.otpFile = options.otpFile;
    this.amount = options.amount;
    this.resetSavedMethod = options.resetSavedMethod === true;
  }

  async openPaymentDialog() {
    const withdrawButton = this.page.getByRole('button', { name: /^withdraw$/i });
    await expect(withdrawButton).toBeEnabled();
    await withdrawButton.click();
    const paymentDialog = this.page.getByRole('dialog');
    await expect(
      paymentDialog.getByRole('heading', { name: /select payment method/i }).first(),
    ).toBeVisible();
    return paymentDialog;
  }

  savedBkashLocators(paymentDialog) {
    const savedBkash = paymentDialog.getByRole('radio', {
      name: new RegExp(`bkash.*${this.bkashNumber}.*${this.accountHolder}`, 'i'),
    });
    const savedBkashCard = paymentDialog
      .getByText(this.bkashNumber, { exact: true })
      .first()
      .locator('xpath=ancestor::div[contains(@class,"border")][1]');
    return { savedBkash, savedBkashCard };
  }

  async hasSavedBkash(paymentDialog) {
    const { savedBkash, savedBkashCard } = this.savedBkashLocators(paymentDialog);
    try {
      await expect(savedBkash.or(savedBkashCard).first()).toBeVisible({ timeout: 5_000 });
      return true;
    } catch {
      return false;
    }
  }

  async removeSavedBkashIfNeeded(paymentDialog) {
    if (!this.resetSavedMethod || !(await this.hasSavedBkash(paymentDialog))) return;
    let { savedBkash, savedBkashCard } = this.savedBkashLocators(paymentDialog);
    const methodCard = (await savedBkashCard.isVisible().catch(() => false))
      ? savedBkashCard
      : savedBkash.locator('xpath=ancestor::*[.//button][1]');
    const removeButton = methodCard.getByRole('button', { name: /remove|delete/i }).first();
    await expect(removeButton).toBeVisible();
    await removeButton.click();
    const confirmRemoval = this.page.getByRole('button', {
      name: /confirm|yes.*(?:remove|delete)|(?:remove|delete)/i,
    }).last();
    if (await confirmRemoval.isVisible().catch(() => false)) {
      await confirmRemoval.click();
    }
    await expect(savedBkash).not.toBeVisible();
  }

  async ensureBkashMethod(paymentDialog) {
    await this.removeSavedBkashIfNeeded(paymentDialog);
    let { savedBkash, savedBkashCard } = this.savedBkashLocators(paymentDialog);

    if (!(await this.hasSavedBkash(paymentDialog))) {
      const addMethodButton = paymentDialog
        .getByRole('button', { name: /add new method/i })
        .last();
      await addMethodButton.click();
      await expect(
        this.page.getByRole('dialog').getByText(/add withdrawal method/i).first(),
      ).toBeVisible();

      await this.page.getByText(/^bkash$/i).first().click();
      await this.page.getByRole('textbox', { name: /account holder name/i }).fill(this.accountHolder);
      await this.page.getByRole('textbox', { name: /mobile number/i }).fill(this.bkashNumber);
      await this.page.getByRole('button', { name: /^next$/i }).click();

      const verifyDialog = this.page.getByRole('dialog');
      await expect(verifyDialog.getByText(/verify your identity/i)).toBeVisible();
      await verifyDialog.getByRole('button', { name: /send otp/i }).click();

      const otpInputs = verifyDialog.locator('input:visible');
      await expect(otpInputs.first()).toBeVisible();
      let activeOtp = this.otp;
      if (!activeOtp) {
        console.log(`⏳ Waiting for OTP in ${this.otpFile}`);
        for (let attempt = 0; attempt < 120; attempt += 1) {
          if (fs.existsSync(this.otpFile)) {
            const candidate = fs.readFileSync(this.otpFile, 'utf8').trim();
            if (/^\d{6}$/.test(candidate)) {
              activeOtp = candidate;
              break;
            }
          }
          await this.page.waitForTimeout(1_000);
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

      await verifyDialog.getByRole('button', { name: /verify|confirm|submit/i }).last().click();
      ({ savedBkash, savedBkashCard } = this.savedBkashLocators(this.page.getByRole('dialog')));
    }

    if (await savedBkash.isVisible().catch(() => false)) {
      await savedBkash.check();
    } else {
      await expect(savedBkashCard).toBeVisible();
      await savedBkashCard.click();
    }
    const continueButton = this.page.getByRole('dialog').getByRole('button', { name: /^continue$/i });
    await expect(continueButton).toBeEnabled();
    await continueButton.click();
  }

  async submitAmount() {
    const amountInput = this.page.locator('input[name="amount"]:visible');
    await expect(amountInput).toBeVisible();
    await amountInput.fill(String(this.amount));
    await expect(amountInput).toHaveValue(String(this.amount));
    await this.page.getByRole('button', { name: /submit request/i }).click();

    const finalConfirmation = this.page.getByRole('button', {
      name: /confirm|yes.*submit|confirm withdrawal/i,
    });
    if (await finalConfirmation.isVisible().catch(() => false)) {
      await finalConfirmation.click();
    }
  }
}

module.exports = { WithdrawalPage };

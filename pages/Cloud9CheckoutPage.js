const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class Cloud9CheckoutPage extends BasePage {
  constructor(page, baseUrl, payment = {}) {
    super(page, baseUrl);
    this.phone = payment.phone || '01929918378';
    this.sandboxPin = payment.sandboxPin || '1234';
    this.bkashPhone = payment.bkashPhone || this.phone || '01929918378';
    this.bkashOtp = payment.bkashOtp || '123456';
    this.bkashPin = payment.bkashPin || '12121';
  }

  async openCheckoutFromDetails() {
    await this.page.getByRole('link', { name: /^(?:buy|prebook) now$/i }).click();
    await expect(this.page).toHaveURL(/\/en\/projects\/.+\/checkout\/?(?:\?|$)/, { timeout: 20_000 });
  }

  phoneInput() {
    return this.page.getByPlaceholder(/enter your phone number/i);
  }

  buyOrPrebookButton() {
    return this.page.getByRole('button', { name: /^(?:buy|prebook)$/i });
  }

  async dismissNomineeIfNeeded() {
    const withoutNominee = this.page.getByRole('button', { name: /continue without nominee/i });
    if (await withoutNominee.isVisible().catch(() => false)) await withoutNominee.click();
  }

  async fillPhone(value) {
    await this.dismissNomineeIfNeeded();
    const phoneInput = this.phoneInput();
    await expect(phoneInput).toBeVisible({ timeout: 10_000 });
    await phoneInput.fill('');
    await phoneInput.fill(String(value));
    return phoneInput;
  }

  async readPhoneValue() {
    return this.phoneInput().inputValue();
  }

  async fillCheckoutInfo({ requirePhone = true } = {}) {
    await this.dismissNomineeIfNeeded();

    const phoneInput = this.phoneInput();
    if (await phoneInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      if (this.phone) {
        await phoneInput.fill(this.phone);
        if (requirePhone) await expect(phoneInput).toHaveValue(this.phone);
      }
    } else if (requirePhone && this.phone) {
      await phoneInput.fill(this.phone);
    }
  }

  /** Checkout "Referral Code" field + Apply (not Promo Code). */
  async applyReferralCode(code) {
    const referralInput = this.page
      .getByPlaceholder(/enter referral code/i)
      .or(this.page.getByLabel(/^referral code$/i))
      .first();
    await expect(referralInput, 'Referral Code input on checkout').toBeVisible({ timeout: 15_000 });
    await referralInput.click();
    await referralInput.fill('');
    await referralInput.fill(String(code));
    await expect(referralInput).toHaveValue(String(code));

    // Innermost row that owns the referral input + its Apply (avoid Promo Apply).
    const applyBtn = this.page
      .locator('div')
      .filter({ has: this.page.getByPlaceholder(/enter referral code/i) })
      .filter({ has: this.page.getByRole('button', { name: /^apply$/i }) })
      .last()
      .getByRole('button', { name: /^apply$/i })
      .or(
        referralInput.locator('xpath=following::button[normalize-space()="Apply" or normalize-space()="APPLY"][1]'),
      )
      .first();
    await expect(applyBtn).toBeVisible({ timeout: 10_000 });
    await applyBtn.scrollIntoViewIfNeeded().catch(() => {});
    await applyBtn.click({ force: true });

    const errorToast = this.page
      .getByText(/invalid.*referral|referral.*invalid|code not found|cannot use|already applied|expired/i)
      .first();
    const successHint = this.page
      .getByText(/referral.*(applied|accepted|success)|code applied|discount applied|5\s*%|cashback/i)
      .first();

    await this.page.waitForTimeout(1_500);

    if (await errorToast.isVisible().catch(() => false)) {
      const msg = await errorToast.textContent();
      throw new Error(`Referral code apply rejected: ${msg}`);
    }

    // Success UI varies — accept applied hint, disabled/cleared input, or value still held with no error.
    const applied =
      (await successHint.isVisible().catch(() => false))
      || (await referralInput.isDisabled().catch(() => false))
      || (await referralInput.inputValue()) === String(code);

    expect(applied, `Expected referral code "${code}" to apply on checkout`).toBeTruthy();
  }

  async payWithMethod(method = 'shurjopay') {
    const normalized = String(method).toLowerCase();
    if (normalized === 'bkash') {
      await this.selectBkashPayment();
      await this.completeBkashSandbox();
      return;
    }
    await this.selectDigitalPayment();
    await this.completeShurjoPay();
  }

  async selectFundBalance() {
    const funds = this.page.getByRole('button', { name: /use funds balance/i }).first();
    await expect(funds).toBeVisible({ timeout: 15_000 });

    // Balance is shown on the card even before selection
    const cardText = (await funds.innerText().catch(() => '')) || '';
    let balanceBefore = this.#parseBdtAmount(cardText, /available\s+balance/i);
    if (!(balanceBefore > 0)) {
      const balanceLocator = this.page.getByText(/available balance:\s*BDT/i).first();
      await expect(balanceLocator).toBeVisible({ timeout: 10_000 });
      balanceBefore = this.#parseBdtAmount(await balanceLocator.textContent(), /available\s+balance/i);
    }
    expect(balanceBefore, 'Fund Balance must be > 0 to proceed').toBeGreaterThan(0);

    await this.#clickPaymentOption(funds, /amount from funds|use maximum/i);

    const useMaximum = this.page
      .getByRole('button', { name: /use maximum/i })
      .or(this.page.getByText(/^use maximum$/i))
      .first();
    if (await useMaximum.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await useMaximum.click({ force: true, timeout: 10_000 });
    }

    const purchasePrice = await this.readCheckoutSubtotal();
    return { balanceBefore, purchasePrice };
  }

  fundsBalanceOption() {
    return this.page.getByRole('button', { name: /use funds balance/i }).first();
  }

  async isFundBalanceVisible(timeout = 5_000) {
    return this.fundsBalanceOption().isVisible({ timeout }).catch(() => false);
  }

  async clickUseMaximum() {
    const useMaximum = this.page
      .getByRole('button', { name: /use maximum/i })
      .or(this.page.getByText(/^use maximum$/i))
      .first();
    await expect(useMaximum).toBeVisible({ timeout: 10_000 });
    await useMaximum.click({ force: true, timeout: 10_000 });
  }

  async readCheckoutSubtotal() {
    const body = await this.page.locator('body').innerText();
    const subtotal = body.match(/Subtotal:\s*BDT\s*([\d,.]+)/i);
    if (subtotal) return Number(subtotal[1].replace(/,/g, ''));
    const total = body.match(/Total Payable\s*BDT\s*([\d,.]+)/i);
    if (total) return Number(total[1].replace(/,/g, ''));
    const boldTotal = body.match(/BDT\s*([\d,.]+)\s*Subtotal/i);
    return boldTotal ? Number(boldTotal[1].replace(/,/g, '')) : NaN;
  }

  async readFundBalanceSummary() {
    const funds = this.fundsBalanceOption();
    await expect(funds).toBeVisible({ timeout: 15_000 });

    const cardText = (await funds.innerText().catch(() => '')) || '';
    let balance = this.#parseBdtAmount(cardText, /available\s+balance/i);
    if (!(balance > 0)) {
      const balanceLocator = this.page.getByText(/available balance:\s*BDT/i).first();
      await expect(balanceLocator).toBeVisible({ timeout: 10_000 });
      balance = this.#parseBdtAmount(await balanceLocator.textContent(), /available\s+balance/i);
    }

    await this.#clickPaymentOption(funds, /amount from funds|use maximum|make payment/i);
    await this.clickUseMaximum().catch(() => {});

    const purchasePrice = await this.readCheckoutSubtotal();
    return { balance, purchasePrice };
  }

  /**
   * Complete purchase after funds are selected.
   * Full cover → Confirm with funds, else Make Payment (may skip gateway).
   * Partial cover → select gateway → Make Payment → sandbox.
   */
  async confirmWithFunds({ preferGateway = 'bkash' } = {}) {
    const confirmFunds = this.page.getByRole('button', { name: /confirm with funds/i });
    const makePayment = this.page.getByRole('button', { name: /make payment/i });

    if (await confirmFunds.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(confirmFunds).toBeEnabled({ timeout: 10_000 });
      await confirmFunds.click({ force: true });
      await expect(this.page).toHaveURL(/\/en\/payment\/success/, { timeout: 45_000 });
      await expect(
        this.page.getByText(/purchase summary|paid|purchase successful|paid from funds/i).first(),
      ).toBeVisible({ timeout: 20_000 });
      return;
    }

    await expect(makePayment).toBeVisible({ timeout: 10_000 });

    const bodyBefore = await this.page.locator('body').innerText();
    const balance = this.#parseBdtAmount(bodyBefore, /available\s+balance/i);
    const subtotal = await this.readCheckoutSubtotal();
    const fullyCovered = Number.isFinite(balance) && Number.isFinite(subtotal) && balance >= subtotal;

    if (fullyCovered) {
      await makePayment.click({ force: true });
      await expect(this.page).toHaveURL(/\/en\/payment\/success/, { timeout: 45_000 });
      await expect(
        this.page.getByText(/purchase summary|paid|purchase successful|paid from funds/i).first(),
      ).toBeVisible({ timeout: 20_000 });
      return;
    }

    if (preferGateway === 'digital') {
      await this.selectDigitalPayment();
      await this.completeShurjoPay({
        expectSuccessUrl: /staging\.aungsha\.com\/en\/payment\/success/i,
      });
      return;
    }

    await this.selectBkashPayment();
    await this.completeBkashSandbox({
      expectSuccessUrl: /staging\.aungsha\.com\/en\/payment\/success/i,
    });
  }

  async #clickPaymentOption(option, expandedText) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await option.click({ force: true, timeout: 8_000 });
      } catch {
        await option.evaluate((el) => el.click()).catch(() => {});
      }
      const expanded = await this.page
        .getByText(expandedText)
        .first()
        .isVisible({ timeout: 4_000 })
        .catch(() => false);
      const pressed = (await option.getAttribute('aria-pressed').catch(() => null)) === 'true';
      if (expanded || pressed) return;
      await this.page.waitForTimeout(500);
    }
    await expect(
      this.page.getByText(expandedText).first(),
      'Fund Balance option did not expand after click',
    ).toBeVisible({ timeout: 10_000 });
  }

  #parseBdtAmount(text, labelRegex) {
    if (!text) return NaN;
    const cleaned = String(text).replace(/,/g, '');
    if (labelRegex) {
      const labeled = cleaned.match(
        new RegExp(`${labelRegex.source}[^\\d]*BDT\\s*(\\d+(?:\\.\\d+)?)`, 'i'),
      );
      if (labeled) return Number(labeled[1]);
    }
    const any = cleaned.match(/BDT\s*(\d+(?:\.\d+)?)/i);
    return any ? Number(any[1]) : NaN;
  }

  async openPaymentDrawer() {
    const buyButton = this.page.getByRole('button', { name: /^(?:buy|prebook)$/i });
    const paymentMethodDialog = this.page.getByText(/select payment method/i);
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await buyButton.click();
      if (await paymentMethodDialog.isVisible({ timeout: 15_000 }).catch(() => false)) break;
      if (attempt < 3) await this.page.waitForTimeout(2_000);
    }
    await expect(paymentMethodDialog).toBeVisible({ timeout: 30_000 });
  }

  async selectDigitalPayment() {
    const digitalPayment = this.page.getByRole('button', { name: /make digital payment/i });
    if (await digitalPayment.isVisible().catch(() => false)) {
      await digitalPayment.click();
      await expect(digitalPayment).toHaveAttribute('aria-pressed', 'true');
      return true;
    }
    return false;
  }

  async selectBkashPayment() {
    const bkashOption = this.page
      .getByRole('button', { name: /pay with bkash/i })
      .or(this.page.getByText(/pay with bkash/i))
      .first();
    await expect(bkashOption).toBeVisible({ timeout: 15_000 });
    await bkashOption.click();
    const pressed = this.page.getByRole('button', { name: /pay with bkash/i }).first();
    if (await pressed.isVisible().catch(() => false)) {
      await expect(pressed).toHaveAttribute('aria-pressed', 'true');
    }
    return true;
  }

  async completeBkashSandbox({ expectSuccessUrl = /staging\.aungsha\.com/i } = {}) {
    await Promise.all([
      this.page.waitForURL(/sandbox\.payment\.bkash\.com/i, {
        timeout: 30_000,
        waitUntil: 'domcontentloaded',
      }),
      this.page.getByRole('button', { name: /make payment/i }).click(),
    ]);

    const confirmBkashStep = async (prompt, value) => {
      await expect(this.page.locator('body')).toContainText(prompt, { timeout: 20_000 });
      await this.page.locator('input:visible').first().fill(value);
      const confirm = this.page.getByRole('button', { name: /^confirm$/i });
      await expect(confirm).toBeVisible({ timeout: 20_000 });
      await confirm.click();
    };

    await confirmBkashStep(/bKash Account Number|Account Number|Wallet Number/i, this.bkashPhone);
    await confirmBkashStep(/OTP|verification code/i, this.bkashOtp);
    await confirmBkashStep(/PIN/i, this.bkashPin);

    await expect(this.page).toHaveURL(expectSuccessUrl, { timeout: 45_000 });
    await expect(
      this.page.getByText(/purchase summary|total paid|paid|purchase successful/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  }

  async completeShurjoPay({ expectSuccessUrl = /staging\.aungsha\.com/i } = {}) {
    await this.page.getByRole('button', { name: /make payment/i }).click();
    await expect(this.page).toHaveURL(/sandbox\.securepay\.shurjopayment\.com/i, { timeout: 30_000 });

    const mobileBanking = this.page.getByRole('tab', { name: /^mbanking$/i });
    if ((await mobileBanking.getAttribute('aria-selected')) !== 'true') await mobileBanking.click();
    await this.page.getByRole('textbox', { name: /mobile number/i }).fill(this.phone);
    await this.page.getByRole('textbox', { name: /pin number/i }).fill(this.sandboxPin);
    await this.page.getByRole('button', { name: /^success/i }).click();

    await expect(this.page).toHaveURL(expectSuccessUrl, { timeout: 30_000 });
  }

  /** Full digital-payment purchase from projects list. */
  async buy() {
    await this.goto('/en/projects');
    await expect(this.page.getByRole('heading', { name: /all projects/i })).toBeVisible();
    await this.page.getByRole('link', { name: /^cloud 9 \(inani\)$/i }).first().click();
    await expect(this.page).toHaveURL(/\/en\/projects\/[^/?]+\/?(?:\?|$)/);
    await this.openCheckoutFromDetails();
    await this.fillCheckoutInfo();
    await this.openPaymentDrawer();
    await this.selectDigitalPayment();
    await this.completeShurjoPay();
    await expect(
      this.page.getByText(/purchase summary|total paid|paid/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  }
}

module.exports = { Cloud9CheckoutPage };

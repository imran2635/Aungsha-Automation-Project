const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class Cloud9CheckoutPage extends BasePage {
  constructor(page, baseUrl, payment = {}) {
    super(page, baseUrl);
    this.phone = payment.phone;
    this.sandboxPin = payment.sandboxPin || '1234';
    this.bkashPhone = payment.bkashPhone || payment.phone;
    this.bkashOtp = payment.bkashOtp || '123456';
    this.bkashPin = payment.bkashPin || '12121';
  }

  async openCheckoutFromDetails() {
    await this.page.getByRole('link', { name: /^(?:buy|prebook) now$/i }).click();
    await expect(this.page).toHaveURL(/\/en\/projects\/.+\/checkout\/?(?:\?|$)/, { timeout: 20_000 });
  }

  async fillCheckoutInfo({ requirePhone = true } = {}) {
    const withoutNominee = this.page.getByRole('button', { name: /continue without nominee/i });
    if (await withoutNominee.isVisible().catch(() => false)) await withoutNominee.click();

    const phoneInput = this.page.getByPlaceholder(/enter your phone number/i);
    if (await phoneInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      if (this.phone) {
        await phoneInput.fill(this.phone);
        if (requirePhone) await expect(phoneInput).toHaveValue(this.phone);
      }
    } else if (requirePhone && this.phone) {
      await phoneInput.fill(this.phone);
    }
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

  async selectFundBalance() {
    const useFundsButton = this.page.getByRole('button', { name: /use funds balance/i });
    await expect(useFundsButton).toBeVisible();
    const balanceLocator = this.page.getByText(/available balance/i).first();
    await expect(balanceLocator).toBeVisible();
    const balanceRaw = await balanceLocator.textContent();
    const balanceNums = balanceRaw?.replace(/,/g, '').match(/(\d+)/g);
    const balanceBefore = balanceNums ? Number(balanceNums[balanceNums.length - 1]) : 0;
    expect(balanceBefore, 'Fund Balance must be > 0 to proceed').toBeGreaterThan(0);

    if ((await useFundsButton.getAttribute('aria-pressed')) !== 'true') {
      await useFundsButton.click();
    }
    await expect(useFundsButton).toHaveAttribute('aria-pressed', 'true');
    await expect(this.page.getByText(/amount from funds/i)).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Use maximum' })).toBeVisible();

    const fundAmountText = await this.page.getByText(/use maximum:.*BDT/i).first().textContent().catch(() => '');
    const purchasePriceNums = fundAmountText.replace(/,/g, '').match(/(\d+)/g);
    const purchasePrice = purchasePriceNums ? Number(purchasePriceNums[purchasePriceNums.length - 1]) : 0;
    if (purchasePrice > 0) {
      expect(
        balanceBefore,
        `Fund Balance (BDT ${balanceBefore}) must be >= purchase price (BDT ${purchasePrice})`,
      ).toBeGreaterThanOrEqual(purchasePrice);
    }

    return { balanceBefore, purchasePrice };
  }

  async confirmWithFunds() {
    const confirmButton = this.page.getByRole('button', { name: /confirm with funds/i });
    await expect(confirmButton).toBeEnabled({ timeout: 10_000 });
    await confirmButton.click();
    await expect(this.page).toHaveURL(/\/en\/payment\/success/, { timeout: 30_000 });
    await expect(this.page.getByText(/^paid$/i).first()).toBeVisible();
    await expect(this.page.getByText(/paid from funds/i).first()).toBeVisible();
    await expect(this.page.getByText(/purchase summary/i)).toBeVisible();
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

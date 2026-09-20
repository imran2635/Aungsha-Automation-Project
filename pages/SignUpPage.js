const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class SignUpPage extends BasePage {
  constructor(page, baseUrl, profile = {}) {
    super(page, baseUrl);
    this.firstName = profile.firstName || 'Jaman';
    this.lastName = profile.lastName || 'Hossain';
    this.password = profile.password;
  }

  get verificationHeading() {
    return this.page.getByRole('heading', { name: /verify your account/i });
  }

  async open() {
    await this.goto('/en');
    await expect(this.page).toHaveURL(/\/en\/?$/);
    await this.goto('/en/sign-up?next=%2Fen');
    await expect(this.page).toHaveURL(/\/en\/sign-up/);
  }

  async createAccountWithEmail(email, password) {
    const emailTab = this.page.getByRole('button', { name: /^email$/i });
    if (await emailTab.isVisible().catch(() => false)) {
      await emailTab.click();
    }
    await this.page.getByPlaceholder(/enter your email address/i).fill(email);
    await this.page.getByPlaceholder(/create a strong password/i).fill(password);
    await this.page.getByPlaceholder(/re-enter your password/i).fill(password);

    const termsCheckbox = this.page.getByRole('checkbox');
    await termsCheckbox.check();
    await expect(termsCheckbox).toBeChecked();
    await this.page.getByRole('button', { name: /^continue$/i }).click();

    const verificationStep = this.page
      .getByText(/verification code|enter.*(?:otp|code)|verify.*email/i)
      .first();
    await expect.poll(
      async () =>
        !/\/en\/sign-up(?:\?|$)/.test(this.page.url()) ||
        (await verificationStep.isVisible().catch(() => false)),
      {
        message: 'Expected signup to continue to email/OTP verification',
        timeout: 20_000,
      },
    ).toBe(true);
  }

  async signUpWithReferral(referralUrl, email) {
    await this.goto(referralUrl);
    await expect(this.page).toHaveURL(/\/sign-up.*ref=/i);
    await this.page.waitForTimeout(1_500);

    const acceptCookies = this.page.getByRole('button', { name: /^accept$/i });
    if (await acceptCookies.isVisible().catch(() => false)) {
      await acceptCookies.click();
    }

    const emailTab = this.page.getByRole('tab', { name: /^email$/i });
    await expect(emailTab).toBeVisible();
    await emailTab.click();
    await expect(emailTab).toHaveAttribute('aria-selected', 'true');

    const emailInput = this.page.locator('input[name="email_address"]:visible');
    await expect(emailInput).toBeVisible();

    await this.page.locator('input[name="firstName"]:visible').fill(this.firstName);
    await this.page.locator('input[name="lastName"]:visible').fill(this.lastName);
    await emailInput.fill(email);
    await this.page.locator('input[name="password"]:visible').fill(this.password);

    const confirmPassword = this.page.getByPlaceholder(/re-enter|confirm.*password/i);
    if (await confirmPassword.isVisible().catch(() => false)) {
      await confirmPassword.fill(this.password);
    }

    await this.page.getByRole('checkbox').check();
    await this.page.getByRole('button', { name: /^continue$/i }).click();

    if (await this.verificationHeading.isVisible({ timeout: 20_000 }).catch(() => false)) return;
    console.log('Verification screen was not shown; checking the mailbox without resubmitting signup');
  }

  async isVerificationVisible() {
    return this.verificationHeading.isVisible().catch(() => false);
  }
}

module.exports = { SignUpPage };

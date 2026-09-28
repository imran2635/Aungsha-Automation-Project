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

  async dismissCookies() {
    const accept = this.page
      .getByRole('region', { name: /cookie/i })
      .getByRole('button', { name: /^accept$/i })
      .or(this.page.getByRole('button', { name: /^accept$/i }))
      .first();
    if (await accept.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await accept.click({ force: true }).catch(() => {});
      await expect(accept).toBeHidden({ timeout: 8_000 }).catch(() => {});
    }
  }

  /** Signup defaults to Phone — switch to Email and wait for email input. */
  async switchToEmailTab() {
    await this.dismissCookies();

    const emailInput = this.page
      .getByPlaceholder(/enter your email address/i)
      .or(this.page.locator('input[name="email_address"]:visible, input[type="email"]:visible'))
      .first();
    if (await emailInput.isVisible({ timeout: 1_500 }).catch(() => false)) return;

    const emailTab = this.page
      .getByRole('tab', { name: /^email$/i })
      .or(this.page.getByRole('button', { name: /^email$/i }))
      .first();
    await expect(emailTab).toBeVisible({ timeout: 15_000 });
    await emailTab.scrollIntoViewIfNeeded().catch(() => {});

    for (let attempt = 1; attempt <= 6; attempt += 1) {
      await emailTab.click({ force: true }).catch(() => {});
      // React-controlled tabs sometimes ignore Playwright click — DOM click backup
      await this.page.evaluate(() => {
        const nodes = [...document.querySelectorAll('[role="tab"], button, [role="button"]')];
        const emailBtn = nodes.find((el) => /^email$/i.test((el.textContent || '').trim()));
        if (emailBtn) emailBtn.click();
      }).catch(() => {});

      await this.page.waitForTimeout(600);
      if (await emailInput.isVisible({ timeout: 1_500 }).catch(() => false)) {
        console.log(`✅ Email signup tab active (attempt ${attempt}): PASSED`);
        return;
      }
    }

    await expect(emailInput, 'Email tab did not reveal email input').toBeVisible({
      timeout: 5_000,
    });
  }

  async createAccountWithEmail(email, password) {
    await this.switchToEmailTab();

    const emailInput = this.page
      .getByPlaceholder(/enter your email address/i)
      .or(this.page.locator('input[name="email_address"]:visible, input[type="email"]:visible'))
      .first();
    await expect(emailInput).toBeVisible({ timeout: 10_000 });

    const fullName = this.page.getByPlaceholder(/full name|your name/i)
      .or(this.page.locator('input[name="fullName"]:visible, input[name="name"]:visible'));
    if (await fullName.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await fullName.first().fill(`${this.firstName} ${this.lastName}`);
    }
    if (await this.page.locator('input[name="firstName"]:visible').isVisible().catch(() => false)) {
      await this.page.locator('input[name="firstName"]:visible').fill(this.firstName);
      await this.page.locator('input[name="lastName"]:visible').fill(this.lastName);
    }

    await emailInput.fill(email);

    const passwordInput = this.page.getByPlaceholder(/create a strong password|enter your password|password/i)
      .or(this.page.locator('input[name="password"]:visible, input[type="password"]:visible'))
      .first();
    await passwordInput.fill(password);

    const confirmPassword = this.page.getByPlaceholder(/re-enter your password|confirm.*password/i)
      .or(this.page.locator('input[name="confirmPassword"]:visible, input[name="password_confirmation"]:visible'));
    if (await confirmPassword.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmPassword.first().fill(password);
    }

    const termsCheckbox = this.page.getByRole('checkbox').first();
    if (await termsCheckbox.isVisible().catch(() => false)) {
      await termsCheckbox.check();
      await expect(termsCheckbox).toBeChecked();
    }
    await this.page.getByRole('button', { name: /^continue$/i }).click();

    const verificationStep = this.page
      .getByText(/verification code|enter.*(?:otp|code)|verify.*email|verify your account/i)
      .first();
    await expect.poll(
      async () =>
        !/\/en\/sign-up(?:\?|$)/.test(this.page.url()) ||
        (await verificationStep.isVisible().catch(() => false)),
      {
        message: 'Expected signup to continue to email/OTP verification',
        timeout: 30_000,
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

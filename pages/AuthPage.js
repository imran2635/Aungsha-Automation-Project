const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class AuthPage extends BasePage {
  async openSignIn() {
    await this.goto('/en/sign-in');
    await expect(this.page).toHaveURL(/\/en\/sign-in(?:\?|$)/);
  }

  async handleCookieConsent() {
    await this.page.waitForTimeout(1_500);
    const acceptCookies = this.page.getByRole('button', { name: /^accept$/i });
    if (await acceptCookies.isVisible().catch(() => false)) {
      await acceptCookies.click();
      await expect(acceptCookies).toBeHidden();
    }
  }

  async fillCredentials(email, password) {
    const emailInput = this.page.getByPlaceholder(/enter your email address/i);
    for (let i = 0; i < 5; i += 1) {
      if (await emailInput.isVisible().catch(() => false)) break;
      const emailTab = this.page.getByRole('tab', { name: /^email$/i })
        .or(this.page.getByRole('button', { name: /^email$/i }));
      await emailTab.first().click();
      await this.page.waitForTimeout(500);
    }
    await expect(emailInput).toBeVisible();
    const passwordInput = this.page.getByPlaceholder(/enter your password/i);
    await emailInput.fill(email);
    await passwordInput.fill(password);
    await expect(emailInput).toHaveValue(email);
    await expect(passwordInput).toHaveValue(password);
  }

  async submitLogin() {
    await this.page.getByRole('button', { name: /^continue$/i }).click();
    await expect(this.page).not.toHaveURL(/\/en\/sign-in(?:\?|$)/, { timeout: 20_000 });
  }

  /** Simple login used by most flows (cookie + credentials + submit). */
  async loginSimple(email, password) {
    await this.openSignIn();
    await this.handleCookieConsent();
    await this.fillCredentials(email, password);
    await this.submitLogin();
  }

  /** Robust login with retries (referral / support flows). */
  async login(email, password) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await this.goto('/en/sign-in');
        await this.page.waitForTimeout(1_000);
        if (!/\/en\/sign-in(?:\?|$)/.test(this.page.url())) return;

        const emailInput = this.page.getByPlaceholder(/enter your email address/i);
        if (!(await emailInput.isVisible().catch(() => false))) {
          const emailTab = this.page.getByRole('tab', { name: /^email$/i })
            .or(this.page.getByRole('button', { name: /^email$/i }));
          await emailTab.first().click({ timeout: 10_000 });
        }
        await emailInput.fill(email, { timeout: 10_000 });
        await this.page.getByPlaceholder(/enter your password/i).fill(password, { timeout: 10_000 });
        await this.page.getByRole('button', { name: /^continue$/i }).click({ timeout: 10_000 });

        let authenticated = false;
        await expect.poll(async () => {
          const cookies = await this.page.context().cookies(this.baseUrl);
          authenticated = cookies.some((cookie) => cookie.name === 'access_token' && cookie.value);
          return authenticated || !/\/en\/sign-in(?:\?|$)/.test(this.page.url());
        }, {
          timeout: 20_000,
          intervals: [500, 1_000, 2_000],
          message: 'Expected login to navigate away or set an access token',
        }).toBe(true);

        if (/\/en\/sign-in(?:\?|$)/.test(this.page.url()) && authenticated) {
          await this.goto('/en/dashboard');
        }
        await expect(this.page).not.toHaveURL(/\/en\/sign-in(?:\?|$)/, { timeout: 20_000 });
        return;
      } catch (error) {
        const cookies = await this.page.context().cookies(this.baseUrl);
        const authenticated = cookies.some((cookie) => cookie.name === 'access_token' && cookie.value);
        if (authenticated) {
          await this.goto('/en/dashboard');
          return;
        }
        if (attempt === 3) throw error;
        console.log(`Login attempt ${attempt}/3 was interrupted; retrying with a fresh page load`);
        await this.page.goto('about:blank', { waitUntil: 'commit', timeout: 10_000 }).catch(async () => {
          await this.page.evaluate(() => window.stop()).catch(() => {});
        });
      }
    }
  }
}

module.exports = { AuthPage };

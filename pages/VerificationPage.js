const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class VerificationPage extends BasePage {
  get verificationHeading() {
    return this.page.getByRole('heading', { name: /verify your account/i });
  }

  async complete(verification) {
    if (verification.otp) {
      if (!(await this.verificationHeading.isVisible().catch(() => false))) {
        await this.goto('/en/verify-email');
      }
      await expect(this.verificationHeading).toBeVisible({ timeout: 20_000 });

      const inputs = this.page.locator('input:visible:not([type="checkbox"]):not([type="hidden"])');
      await expect(inputs.first()).toBeVisible();
      if ((await inputs.count()) === 1) {
        await inputs.first().fill(verification.otp);
      } else {
        for (const [index, digit] of [...verification.otp].entries()) {
          await inputs.nth(index).fill(digit);
        }
      }
      await this.page.getByRole('button', { name: /verify|confirm|continue|submit/i }).last().click();
      await expect(this.verificationHeading).not.toBeVisible({ timeout: 20_000 });
      return;
    }

    await this.goto(verification.verificationUrl);
  }
}

module.exports = { VerificationPage };

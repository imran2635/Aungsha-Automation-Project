const { expect } = require('@playwright/test');

class BasePage {
  constructor(page, baseUrl = 'https://staging.aungsha.com') {
    this.page = page;
    this.baseUrl = baseUrl;
  }

  async goto(path, options = {}) {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    await this.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
      ...options,
    });
  }

  /**
   * "We use cookies" banner — Accept is a sibling of the region (not nested),
   * so click the page-level Accept button when the banner is visible.
   */
  async handleCookieConsent() {
    await this.page.waitForTimeout(800);
    const banner = this.page
      .getByRole('region', { name: /cookie/i })
      .or(this.page.getByRole('heading', { name: /we use cookies/i }))
      .first();
    const accept = this.page.getByRole('button', { name: /^accept$/i }).first();

    const bannerVisible = await banner.isVisible({ timeout: 3_000 }).catch(() => false);
    const acceptVisible = await accept.isVisible({ timeout: bannerVisible ? 2_000 : 500 }).catch(() => false);
    if (!bannerVisible && !acceptVisible) return;

    await expect(accept, 'Cookie banner Accept button').toBeVisible({ timeout: 5_000 });
    await accept.scrollIntoViewIfNeeded().catch(() => {});
    await accept.click({ force: true });
    await this.page.evaluate(() => {
      const nodes = [...document.querySelectorAll('button')];
      const btn = nodes.find((el) => /^accept$/i.test((el.textContent || '').trim()));
      if (!btn) return;
      const style = window.getComputedStyle(btn);
      if (style.visibility === 'hidden' || style.display === 'none') return;
      btn.click();
    }).catch(() => {});
    await expect(banner).toBeHidden({ timeout: 8_000 }).catch(() => {});
    await expect(accept).toBeHidden({ timeout: 3_000 }).catch(() => {});
    console.log('✅ We use cookies — Accept clicked: PASSED');
  }

  /**
   * Type like a user (best for Next.js server actions / React 19 forms).
   * Avoids synthetic dispatchEvent — that can desync action payload vs visible value.
   */
  async fillReactControlledInput(locator, value) {
    const text = String(value);
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await locator.click({ force: true });
    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
    await this.page.keyboard.press(`${mod}+A`);
    await this.page.keyboard.press('Backspace');
    await locator.pressSequentially(text, { delay: 55 });
    await expect(locator).toHaveValue(text, { timeout: 5_000 });
    await locator.press('Tab').catch(() => {});
    await this.page.waitForTimeout(250);
  }
}

module.exports = { BasePage };

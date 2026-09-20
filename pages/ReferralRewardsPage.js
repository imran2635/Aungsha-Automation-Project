const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class ReferralRewardsPage extends BasePage {
  parseMetric(body, label) {
    const lines = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const labelPattern = new RegExp(`^(?:${label})$`, 'i');
    const labelIndex = lines.findIndex((line) => labelPattern.test(line));
    if (labelIndex === -1) return 0;
    const nearbyText = lines.slice(labelIndex, labelIndex + 4).join(' ');
    const match = nearbyText
      .replace(labelPattern, '')
      .match(/(?:BDT|৳|à§³)?\s*([\d][\d,.]*)/i);
    const value = Number((match?.[1] || '0').replace(/,/g, ''));
    return Number.isFinite(value) ? value : 0;
  }

  async open() {
    await this.goto('/en/dashboard/referral-rewards');
    await expect(this.page.getByRole('heading', { name: /referral rewards/i })).toBeVisible();
  }

  async readMetrics() {
    const body = await this.page.locator('body').innerText();
    return {
      total: this.parseMetric(body, '(?:Total Referrals|Referrals)'),
      successful: this.parseMetric(body, '(?:Successful Referrals|Success)'),
      cashback: this.parseMetric(body, '(?:Total Cashback Earned|Cashback)'),
    };
  }

  async captureReferralUrl() {
    const referralText = await this.page
      .getByText(/staging\.aungsha\.com.*sign-up.*ref=/i)
      .first()
      .textContent();
    const referralUrl = referralText
      ?.replace(/[\u200B-\u200D\uFEFF]/g, '')
      .match(/https?:\/\/[^\s]+/i)?.[0];
    expect(referralUrl, 'Expected referral URL on Referral Rewards page').toBeTruthy();
    return referralUrl;
  }

  async waitForMetricsIncrease(before, referralCount, recoverEmailBonus = 0) {
    let after;
    await expect.poll(async () => {
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      after = await this.readMetrics();
      return after.total >= before.total + referralCount
        && after.successful >= before.successful + referralCount + recoverEmailBonus
        && after.cashback > before.cashback;
    }, {
      timeout: 120_000,
      intervals: [2_000, 5_000, 10_000],
      message: 'Expected referral metrics to reflect all completed referral purchases',
    }).toBe(true);
    return after;
  }
}

module.exports = { ReferralRewardsPage };

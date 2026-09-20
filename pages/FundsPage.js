const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class FundsPage extends BasePage {
  async open() {
    await this.goto('/en/dashboard/my-points');
    await expect(this.page).toHaveURL(/\/en\/dashboard\/my-points/);
  }

  async expectFundsHeading() {
    await expect(this.page.getByRole('heading', { name: /^funds$/i })).toBeVisible();
  }

  async expectWalletTransaction() {
    await expect(this.page.getByText(/wallet transaction/i).first()).toBeVisible();
  }

  async readPendingWithdrawal() {
    const fundsText = await this.page.locator('body').innerText();
    const pendingMatch = fundsText.match(/Pending Withdrawal\s*BDT\s*([\d,.]+)/i);
    return Number((pendingMatch?.[1] || '0').replace(/,/g, ''));
  }

  async readAvailableBalance() {
    const fundsText = await this.page.locator('body').innerText();
    const match = fundsText.replace(/,/g, '').match(/(?:available|balance|fund)[^\d]*(\d+)/i);
    return match ? Number(match[1]) : -1;
  }

  withdrawButton() {
    return this.page.getByRole('button', { name: /^withdraw$/i });
  }
}

module.exports = { FundsPage };

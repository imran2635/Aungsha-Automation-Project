const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class PortfolioPage extends BasePage {
  async open() {
    await this.goto('/en/dashboard/my-portfolio');
    await expect(this.page).toHaveURL(/\/en\/dashboard\/my-portfolio/);
  }

  async gotoWithRetry(url = '/en/dashboard/my-portfolio') {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await this.goto(url);
        return;
      } catch (error) {
        lastError = error;
        if (!/ERR_ABORTED/i.test(String(error)) || attempt === 3) throw error;
        await this.page.waitForTimeout(1_500);
      }
    }
    throw lastError;
  }

  cloud9Card() {
    return this.page.locator('article').filter({ hasText: /^Cloud 9 \(Inani\)/i });
  }

  async openCloud9Details() {
    const card = this.cloud9Card();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.getByRole('link', { name: /^view details$/i }).click();
    await expect(this.page).toHaveURL(/\/en\/dashboard\/my-portfolio\/[^/]+\/?(?:\?|$)/);
  }

  async openFirstHoldingDetails() {
    const viewDetails = this.page
      .locator('a[href*="/en/dashboard/my-portfolio/"]:visible')
      .filter({ hasText: /view details/i })
      .first();
    await expect(viewDetails).toBeVisible();
    await viewDetails.click();
    await expect(this.page).not.toHaveURL(/\/en\/dashboard\/my-portfolio\/?(?:\?|$)/);
  }

  sellToAungshaOption() {
    return this.page
      .locator('div[role="button"]')
      .filter({ hasText: /^Sell to Aungsha[\s\S]*Private buyback/i });
  }

  marketplaceOption() {
    return this.page
      .locator('div[role="button"]')
      .filter({ hasText: /^Go to marketplace[\s\S]*asking price/i });
  }

  sellSharesButton() {
    return this.page.getByRole('button', { name: /^sell shares$/i });
  }

  async selectSellToAungsha() {
    const option = this.sellToAungshaOption();
    await expect(option).toBeVisible();
    await option.click();
    await expect(option.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
  }

  async sellToAungsha() {
    await this.selectSellToAungsha();
    const sellSharesBtn = this.sellSharesButton();
    await expect(sellSharesBtn).toBeEnabled();
    await sellSharesBtn.click();
    await expect(this.page.getByText(/your shares have been sold to Aungsha/i)).toBeVisible({ timeout: 20_000 });
  }

  async goToFundsFromSuccess() {
    await this.page.getByRole('link', { name: /^go to funds$/i }).click();
    await expect(this.page).toHaveURL(/\/en\/dashboard\/my-points\/?(?:\?|$)/);
  }

  async selectMarketplaceAndList(askingPrice) {
    const option = this.marketplaceOption();
    await option.click();
    await expect(option.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');

    const oneUnit = this.page
      .locator('button:visible')
      .filter({ hasText: /Aungsha Share/i })
      .filter({ hasText: /1 units/i });
    await expect(oneUnit.last()).toBeVisible();
    await oneUnit.last().click();
    await expect(this.page.getByText(/maximum available:\s*1/i)).toBeVisible();

    const priceInput = this.page.getByLabel(/selling price per unit/i);
    await priceInput.fill(askingPrice);
    await expect(priceInput).toHaveValue(askingPrice);

    const sellSharesButton = this.sellSharesButton();
    await expect(sellSharesButton).toBeEnabled();
    await sellSharesButton.click();
    await expect(
      this.page.getByText(/great news.*listed for sale|resale offer created/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  }

  async convertUnitToFunds() {
    await this.page.waitForTimeout(1_000);
    const instantWithdrawOption = this.page
      .locator('[role="button"]:visible')
      .filter({ hasText: /instant withdraw/i })
      .first();
    await expect(instantWithdrawOption).toBeVisible();
    await instantWithdrawOption.click();

    await expect(this.page.getByText(/reservation select/i)).toBeVisible();
    const instantWithdrawButton = this.page
      .locator('button:visible')
      .filter({ hasText: /^instant withdraw$/i })
      .last();
    await expect(instantWithdrawButton).toBeEnabled();
    await instantWithdrawButton.click();

    const confirmButton = this.page.getByRole('button', {
      name: /confirm|yes.*withdraw|continue/i,
    });
    if (await confirmButton.isVisible().catch(() => false)) {
      await confirmButton.click();
    }
    await expect(this.page).toHaveURL(/\/en\/dashboard\/my-points/, { timeout: 20_000 });
  }

  async expectHoldingVisible(projectName) {
    const holding = this.page
      .locator('article:visible')
      .filter({ hasText: new RegExp(projectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
      .first();
    await expect(holding).toBeVisible();
    return holding;
  }
}

module.exports = { PortfolioPage };

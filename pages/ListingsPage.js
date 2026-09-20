const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class ListingsPage extends BasePage {
  async openFromSuccessModalOrNav() {
    const modalMyListings = this.page.getByRole('button', { name: /^my listings$/i });
    if (await modalMyListings.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await modalMyListings.click();
      await expect(this.page).toHaveURL(/\/en\/dashboard\/sell-shares\/?(?:\?|$)/, { timeout: 15_000 });
    } else {
      await this.page.getByRole('link', { name: /^my listings$/i }).last().click();
    }
    await expect(this.page).toHaveURL(/\/en\/dashboard\/sell-shares\/?(?:\?|$)/);
  }

  async expectActiveListing(projectName, formattedPrice) {
    const listing = this.page
      .locator('article:visible')
      .filter({ hasText: new RegExp(projectName, 'i') })
      .filter({ hasText: new RegExp(formattedPrice) })
      .first();
    await expect(listing).toBeVisible();
    await expect(listing.getByText(/^active$/i).last()).toBeVisible();
    await expect(listing.getByText(/^1$/).last()).toBeVisible();
    return listing;
  }

  async goHome() {
    const homeLink = this.page.locator('a:visible').filter({ hasText: /^home$/i }).first();
    await expect(homeLink).toBeVisible();
    await homeLink.click();
    await expect(this.page).toHaveURL(/\/en(?:\/dashboard)?\/?(?:\?|$)/);
  }

  async openDashboardPortfolio() {
    await this.goto('/en/dashboard');
    await expect(this.page).toHaveURL(/\/en\/dashboard\/?(?:\?|$)/);
    await this.page.locator('a[href="/en/dashboard/my-portfolio"]').first().click();
    await expect(this.page).toHaveURL(/\/en\/dashboard\/my-portfolio\/?(?:\?|$)/);
  }
}

module.exports = { ListingsPage };

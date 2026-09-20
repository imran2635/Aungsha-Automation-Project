const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class ProjectsPage extends BasePage {
  async open() {
    await this.goto('/en/projects');
    await expect(this.page.getByRole('heading', { name: /all projects/i })).toBeVisible();
  }

  cloud9Link() {
    return this.page.getByRole('link', { name: /^cloud 9 \(inani\)$/i }).first();
  }

  cloud9BuyButton() {
    return this.page
      .locator('article, [class*="card"]')
      .filter({ hasText: /cloud 9 \(inani\)/i })
      .first()
      .getByRole('link', { name: /^(?:buy|prebook) now$/i })
      .first();
  }

  async openCloud9Details() {
    const link = this.cloud9Link();
    await expect(link).toBeVisible();
    await link.click();
    await expect(this.page).toHaveURL(/\/en\/projects\/[^/]+\/?(?:\?|$)/);
  }

  async openPurbachalCheckout() {
    const card = this.page
      .locator('article, [class*="card"]')
      .filter({ hasText: /purbachal hill city/i })
      .first();
    await expect(card).toBeVisible();
    const actionLink = card.getByRole('link', { name: /^(?:prebook|buy now)$/i }).first();
    await expect(actionLink).toBeVisible();
    const href = await actionLink.getAttribute('href');
    expect(href).toMatch(/\/en\/projects\/[^/]+\/checkout/);
    await actionLink.click();
    await expect(this.page).toHaveURL(/\/en\/projects\/[^/]+\/checkout\/?(?:\?|$)/, { timeout: 20_000 });
    await expect(this.page.getByText(/purbachal hill city/i).first()).toBeVisible();
    return href;
  }
}

module.exports = { ProjectsPage };

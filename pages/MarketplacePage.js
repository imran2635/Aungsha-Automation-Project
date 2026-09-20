const { expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { BasePage } = require('./BasePage');

class MarketplacePage extends BasePage {
  async open() {
    const marketplaceLink = this.page.locator('a[href="/en/marketplace"]:visible').first();
    if (await marketplaceLink.isVisible().catch(() => false)) {
      await marketplaceLink.click();
    } else {
      await this.goto('/en/marketplace');
    }
    await expect(this.page).toHaveURL(/\/en\/marketplace\/?(?:\?|$)/);
    await expect(this.page.getByRole('heading', { name: /^all projects$/i })).toBeVisible();
  }

  purchasableCards() {
    return this.page
      .locator('article:visible')
      .filter({ has: this.page.getByRole('link', { name: /^buy now$/i }) });
  }

  async selectRandomPurchasable() {
    const cards = this.purchasableCards();
    const count = await cards.count();
    expect(count, 'Expected at least one purchasable marketplace listing').toBeGreaterThan(0);
    const randomIndex = Math.floor(Math.random() * count);
    const selectedCard = cards.nth(randomIndex);
    const projectLink = selectedCard.locator('a[href*="/en/marketplace/"]').filter({ hasText: /\S/ }).first();
    const projectName = (await projectLink.innerText()).trim();
    expect(projectName).toBeTruthy();
    return { selectedCard, projectName };
  }

  async openCheckout(card) {
    await card.getByRole('link', { name: /^buy now$/i }).click();
    await expect(this.page).toHaveURL(/\/en\/marketplace\/[^/]+\/checkout\/?(?:\?|$)/, { timeout: 20_000 });
    await expect(this.page.getByText(/^order summary$/i)).toBeVisible();
  }

  async fillCheckoutAndOpenPayment(phone) {
    const withoutNominee = this.page.getByRole('button', { name: /continue without nominee/i });
    if (await withoutNominee.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await withoutNominee.click();
    }
    const phoneInput = this.page.getByPlaceholder(/enter your phone number/i);
    if (phone && (await phoneInput.isVisible({ timeout: 2_000 }).catch(() => false))) {
      await phoneInput.fill(phone);
    }
    const buyButton = this.page.getByRole('button', { name: /^buy$/i });
    await expect(buyButton).toBeEnabled({ timeout: 10_000 });
    await buyButton.click();
    await expect(this.page.getByText(/select payment method/i)).toBeVisible({ timeout: 20_000 });
  }

  async selectDigitalPayment() {
    const digitalPayment = this.page.getByRole('button', { name: /make digital payment/i });
    if (await digitalPayment.isVisible().catch(() => false)) {
      await digitalPayment.click();
      await expect(digitalPayment).toHaveAttribute('aria-pressed', 'true');
      return true;
    }
    return false;
  }

  async completeShurjoPay(phone, sandboxPin) {
    await this.page.getByRole('button', { name: /make payment/i }).click();
    await expect(this.page).toHaveURL(/sandbox\.securepay\.shurjopayment\.com/i, { timeout: 30_000 });

    const mobileBankingTab = this.page.getByRole('tab', { name: /^mbanking$/i });
    if ((await mobileBankingTab.getAttribute('aria-selected')) !== 'true') {
      await mobileBankingTab.click();
    }
    await this.page.getByRole('textbox', { name: /mobile number/i }).fill(phone);
    await this.page.getByRole('textbox', { name: /pin number/i }).fill(sandboxPin);
    await this.page.getByRole('button', { name: /^success/i }).click();

    await expect(this.page).toHaveURL(/staging\.aungsha\.com\/en\/payment\/success/i, { timeout: 30_000 });
    await expect(this.page.getByText(/purchase summary|total paid|valid/i).first()).toBeVisible();
  }

  async downloadWithRetry(button, label) {
    await expect(button).toBeEnabled({ timeout: 30_000 });
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const downloadPromise = this.page.waitForEvent('download', { timeout: 20_000 }).catch(() => null);
      await button.click();
      const download = await downloadPromise;
      if (download) return download;
      console.log(`[WAITING] ${label} still preparing (attempt ${attempt}/3)`);
      await this.page.waitForTimeout(3_000);
    }
    throw new Error(`${label} download did not start after 3 attempts`);
  }

  async downloadInvoiceAndCertificate(downloadDir) {
    const downloadTimestamp = Date.now();
    const downloadButtons = this.page.getByRole('button', { name: /^download$/i });

    const invoiceDownload = await this.downloadWithRetry(downloadButtons.nth(0), 'Invoice');
    const invoicePath = path.join(
      downloadDir,
      `marketplace-${downloadTimestamp}-${invoiceDownload.suggestedFilename() || 'invoice.pdf'}`,
    );
    await invoiceDownload.saveAs(invoicePath);
    expect(fs.existsSync(invoicePath)).toBe(true);

    const certDownload = await this.downloadWithRetry(downloadButtons.nth(1), 'Certificate');
    const certPath = path.join(
      downloadDir,
      `marketplace-${downloadTimestamp}-${certDownload.suggestedFilename() || 'certificate.pdf'}`,
    );
    await certDownload.saveAs(certPath);
    expect(fs.existsSync(certPath)).toBe(true);

    return { invoicePath, certPath };
  }

  async openMyListingsTab() {
    await this.page.getByRole('button', { name: /^my listings$/i }).click();
  }

  listingCard(projectFilter, priceFilter) {
    return this.page
      .locator('article:visible')
      .filter({ hasText: projectFilter })
      .filter({ hasText: priceFilter })
      .first();
  }
}

module.exports = { MarketplacePage };

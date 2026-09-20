const { expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { BasePage } = require('./BasePage');

class TransactionsPage extends BasePage {
  async open() {
    await this.goto('/en/dashboard/transactions');
    await expect(this.page).toHaveURL(/\/en\/dashboard\/transactions/);
  }

  async openLatestPaidTransaction() {
    const latestPaidTransaction = this.page
      .locator('a[href*="/en/dashboard/transactions/"]:visible')
      .first();
    await expect(latestPaidTransaction).toBeVisible();
    await latestPaidTransaction.click();
    await expect(this.page).toHaveURL(/\/en\/dashboard\/transactions\/.+type=investment/);
  }

  async extractPaymentAndReservationIds() {
    const paymentId = new URL(this.page.url()).pathname.split('/').pop();
    const detailText = await this.page.locator('body').innerText();
    const ids = detailText.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ) || [];
    const reservationId = ids.find((id) => id.toLowerCase() !== paymentId.toLowerCase());
    expect(reservationId, 'Expected a reservation ID on transaction details').toBeTruthy();
    return { paymentId, reservationId };
  }
}

class PaymentSuccessPage extends BasePage {
  async openFromIds(reservationId, paymentId) {
    await this.goto(
      `/en/payment/success?reservation_id=${reservationId}&payment_id=${paymentId}`,
    );
    await expect(this.page.getByText(/purchase successful/i)).toBeVisible();
  }

  async downloadInvoice(downloadDir) {
    await this.page.waitForTimeout(1_500);
    const invoiceButton = this.page.getByTitle(/download receipt/i);
    await expect(invoiceButton).toBeEnabled();
    const [invoiceDownload] = await Promise.all([
      this.page.waitForEvent('download', { timeout: 20_000 }),
      invoiceButton.click(),
    ]);
    const invoicePath = path.join(downloadDir, invoiceDownload.suggestedFilename() || 'invoice.pdf');
    await invoiceDownload.saveAs(invoicePath);
    expect(fs.existsSync(invoicePath)).toBe(true);
    return invoicePath;
  }

  async downloadCertificate(downloadDir) {
    const certificateButton = this.page.getByTitle(/ownership certificate/i);
    await expect(certificateButton).toBeEnabled();
    const [certificateDownload] = await Promise.all([
      this.page.waitForEvent('download', { timeout: 20_000 }),
      certificateButton.click(),
    ]);
    const certificatePath = path.join(
      downloadDir,
      certificateDownload.suggestedFilename() || 'ownership-certificate.pdf',
    );
    await certificateDownload.saveAs(certificatePath);
    expect(fs.existsSync(certificatePath)).toBe(true);
    return certificatePath;
  }

  async downloadOwnershipCertificateByTitle(downloadDir) {
    const certButton = this.page.getByTitle('Ownership Certificate');
    await expect(certButton).toBeVisible();
    await expect(certButton).toBeEnabled();
    const [certDownload] = await Promise.all([
      this.page.waitForEvent('download', { timeout: 20_000 }),
      certButton.click(),
    ]);
    const certPath = path.join(downloadDir, certDownload.suggestedFilename() || 'ownership-certificate.pdf');
    await certDownload.saveAs(certPath);
    expect(fs.existsSync(certPath)).toBe(true);
    expect(fs.statSync(certPath).size, 'Certificate PDF must not be empty').toBeGreaterThan(0);
    return certPath;
  }

  async goToPortfolioOrNavigate(baseGoto) {
    const goToPortfolio = this.page.getByRole('link', { name: /go to portfolio/i });
    if (await goToPortfolio.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await goToPortfolio.click();
    } else {
      await baseGoto('/en/dashboard/my-portfolio');
    }
    await expect(this.page).toHaveURL(/\/en\/dashboard\/my-portfolio\/?(?:\?|$)/, { timeout: 20_000 });
  }
}

module.exports = { TransactionsPage, PaymentSuccessPage };

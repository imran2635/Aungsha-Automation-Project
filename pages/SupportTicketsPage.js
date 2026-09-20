const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class SupportTicketsPage extends BasePage {
  async open() {
    await this.goto('/en/dashboard/support/tickets', { timeout: 30_000 });
    await expect(this.page).toHaveURL(/\/dashboard\/support\/tickets/);
  }

  async expectDashboard() {
    await expect(this.page.getByRole('heading', { name: /^support$/i })).toBeVisible();
    await expect(this.page.getByText(/total tickets/i)).toBeVisible();
    await expect(this.page.getByText(/pending/i).first()).toBeVisible();
    await expect(this.page.getByText(/resolved/i).first()).toBeVisible();
    await expect(this.page.getByRole('button', { name: /new ticket/i })).toBeVisible();
  }

  async openNewTicketForm() {
    const heading = this.page.getByRole('heading', { name: /create support ticket/i });
    const btn = this.page.getByRole('button', { name: /new ticket/i });
    for (let i = 1; i <= 3; i += 1) {
      await btn.click();
      if (await heading.isVisible({ timeout: 5_000 }).catch(() => false)) break;
      if (i < 3) await this.page.waitForTimeout(1_000);
    }
    await expect(heading).toBeVisible({ timeout: 15_000 });
    return heading;
  }

  async closeFormIfOpen() {
    const closeBtn = this.page.getByRole('button', { name: /close|cancel|×/i }).first();
    if (await closeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await closeBtn.click();
      await this.page.waitForTimeout(500);
    }
  }

  async fillTicket({ phone, category, title, message }) {
    if (phone) {
      const phoneInput = this.page.getByLabel(/phone number/i);
      await expect(phoneInput).toBeVisible();
      await phoneInput.fill(phone);
      await expect(phoneInput).toHaveValue(phone);
    }
    if (category) {
      const categoryCombo = this.page.getByRole('combobox', { name: /category/i });
      await expect(categoryCombo).toBeVisible();
      await categoryCombo.click();
      await this.page.getByRole('option', { name: new RegExp(`^${category}$`, 'i') }).click();
    }
    if (title !== undefined) {
      const titleInput = this.page.getByLabel(/ticket title/i);
      await expect(titleInput).toBeVisible();
      await titleInput.fill(title);
      if (title) await expect(titleInput).toHaveValue(title);
    }
    if (message !== undefined) {
      const descInput = this.page.getByLabel(/problem description/i);
      await expect(descInput).toBeVisible();
      await descInput.fill(message);
      if (message) await expect(descInput).toHaveValue(message);
    }
  }

  async expectPrefill() {
    const fullNameInput = this.page.getByLabel(/full name/i);
    await expect(fullNameInput).toBeVisible();
    const fullNameValue = await fullNameInput.inputValue();
    expect(fullNameValue.trim().length, 'Full Name must be pre-filled').toBeGreaterThan(0);

    const emailField = this.page.getByLabel(/email address/i);
    await expect(emailField).toBeVisible();
    const emailValue = await emailField.inputValue();
    expect(emailValue.trim().length, 'Email must be pre-filled').toBeGreaterThan(0);

    return { fullNameValue, emailValue };
  }

  submitButton() {
    return this.page.getByRole('button', { name: /submit ticket/i });
  }

  async submitTicket(createHeading) {
    const submitBtn = this.submitButton();
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();
    await expect(createHeading).not.toBeVisible({ timeout: 20_000 });
  }

  async openTicketDetails(title) {
    const ticketRow = this.page.locator('tr').filter({ hasText: title }).first();
    await expect(ticketRow).toBeVisible({ timeout: 30_000 });
    await expect(ticketRow).toContainText(/open|pending/i);
    await ticketRow.getByRole('link', { name: /^view$/i }).click();
    await expect(this.page).toHaveURL(/\/dashboard\/support\/(?!tickets(?:\/|$))[^/?#]+/, { timeout: 20_000 });
  }

  async expectTicketDetails(title, message) {
    await expect(this.page.getByRole('heading', { name: title, exact: true }).first()).toBeVisible();
    await expect(this.page.getByText(message, { exact: true }).first()).toBeVisible();
  }

  async ticketRowCount() {
    return this.page.locator('tr').count();
  }

  async dismissFormWithoutSubmit() {
    const closeBtn = this.page.locator('[aria-label*="close" i], button:has-text("×"), button:has-text("Close")').first();
    if (await closeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await closeBtn.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await expect(this.page.getByRole('heading', { name: /create support ticket/i }))
      .not.toBeVisible({ timeout: 10_000 });
  }
}

module.exports = { SupportTicketsPage };

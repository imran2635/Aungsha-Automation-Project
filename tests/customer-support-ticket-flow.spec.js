const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://staging.aungsha.com';
const EMAIL = process.env.AUNGSHA_EMAIL;
const PASSWORD = process.env.AUNGSHA_PASSWORD;
const PHONE = process.env.AUNGSHA_PHONE;
const CATEGORY = process.env.SUPPORT_CATEGORY || 'Technical';

async function login(page) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(`${BASE_URL}/en/sign-in`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await page.waitForTimeout(1_000);
      if (!/\/en\/sign-in(?:\?|$)/.test(page.url())) return;

      const emailInput = page.getByPlaceholder(/enter your email address/i);
      if (!(await emailInput.isVisible().catch(() => false))) {
        await page.getByRole('tab', { name: /^email$/i })
          .or(page.getByRole('button', { name: /^email$/i }))
          .first()
          .click({ timeout: 10_000 });
      }
      await emailInput.fill(EMAIL, { timeout: 10_000 });
      await page.getByPlaceholder(/enter your password/i).fill(PASSWORD, { timeout: 10_000 });
      await page.getByRole('button', { name: /^continue$/i }).click({ timeout: 10_000 });

      let authenticated = false;
      await expect.poll(async () => {
        const cookies = await page.context().cookies(BASE_URL);
        authenticated = cookies.some((cookie) => cookie.name === 'access_token' && cookie.value);
        return authenticated || !/\/en\/sign-in(?:\?|$)/.test(page.url());
      }, {
        timeout: 20_000,
        intervals: [500, 1_000, 2_000],
        message: 'Expected login to navigate away or set an access token',
      }).toBe(true);

      if (/\/en\/sign-in(?:\?|$)/.test(page.url()) && authenticated) {
        await page.goto(`${BASE_URL}/en/dashboard`, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        });
      }
      return;
    } catch (error) {
      const cookies = await page.context().cookies(BASE_URL);
      if (cookies.some((cookie) => cookie.name === 'access_token' && cookie.value)) return;
      if (attempt === 3) throw error;
      await page.goto('about:blank', { waitUntil: 'commit', timeout: 10_000 }).catch(() => {});
    }
  }
}

test('submit a customer support ticket and view its message', async ({ page }) => {
  test.setTimeout(180_000);
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(30_000);

  const runId = Date.now();
  const title = process.env.SUPPORT_TICKET_TITLE
    || `Automated ${CATEGORY.toLowerCase()} support ${runId}`;
  const message = process.env.SUPPORT_TICKET_MESSAGE
    || `Automated ${CATEGORY.toLowerCase()} support message ${runId}: the feature is not working properly.`;
  const reuseExistingTicket = process.env.SUPPORT_REUSE_TICKET === 'true';

  await login(page);
  await page.goto(`${BASE_URL}/en/dashboard/support/tickets`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await expect(page.getByRole('heading', { name: /^support$/i })).toBeVisible();

  if (!reuseExistingTicket) {
    const createTicketHeading = page.getByRole('heading', { name: /create support ticket/i });
    const newTicketButton = page.getByRole('button', { name: /new ticket/i });
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await newTicketButton.click();
      if (await createTicketHeading.isVisible({ timeout: 5_000 }).catch(() => false)) break;
      if (attempt < 3) await page.waitForTimeout(1_000);
    }
    await expect(createTicketHeading).toBeVisible({ timeout: 15_000 });

    const phoneInput = page.getByLabel(/phone number/i);
    await phoneInput.fill(PHONE);
    const category = page.getByRole('combobox', { name: /category/i });
    await category.click();
    await page.getByRole('option', { name: new RegExp(`^${CATEGORY}$`, 'i') }).click();
    await page.getByLabel(/ticket title/i).fill(title);
    await page.getByLabel(/problem description/i).fill(message);
    await page.getByRole('button', { name: /submit ticket/i }).click();

    await expect(createTicketHeading).not.toBeVisible({ timeout: 20_000 });
  }
  const ticketRow = page.locator('tr').filter({ hasText: title }).first();
  await expect(ticketRow).toBeVisible({ timeout: 30_000 });
  await expect(ticketRow).toContainText(/open|pending/i);
  await ticketRow.getByRole('link', { name: /^view$/i }).click();

  await expect(page).toHaveURL(/\/dashboard\/support\/(?!tickets(?:\/|$))[^/?#]+/, { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: title, exact: true }).first()).toBeVisible();
  await expect(page.getByText(message, { exact: true }).first()).toBeVisible();

  console.log(`Support ticket submitted and opened: ${title}`);
  console.log(`Support ticket message verified: ${message}`);
});

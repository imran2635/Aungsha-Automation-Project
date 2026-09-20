const { test, expect } = require('@playwright/test');
const allure = require('allure-js-commons');
const { AuthPage } = require('../pages/AuthPage');
const { SupportTicketsPage } = require('../pages/SupportTicketsPage');

const BASE_URL = 'https://staging.aungsha.com';
const EMAIL = process.env.AUNGSHA_EMAIL;
const PASSWORD = process.env.AUNGSHA_PASSWORD;
const PHONE = process.env.AUNGSHA_PHONE;
const CATEGORY = process.env.SUPPORT_CATEGORY || 'Other';

test.describe('Customer Support Ticket Flow', () => {
  test.beforeEach(async () => {
    await allure.epic('Aungsha Staging');
    await allure.feature('Customer Support');
    await allure.owner('QA Automation');
    await allure.tags('support', 'ticket', 'staging');
  });

  test('✅ POSITIVE — Full support-ticket flow (19 checkpoints)', async ({ page }) => {
    test.setTimeout(180_000);
    page.setDefaultTimeout(15_000);
    page.setDefaultNavigationTimeout(30_000);

    await allure.severity('critical');
    await allure.story('Create support ticket and verify details');
    await allure.description(
      'Validates the full customer support ticket journey: login, open Support, create ticket with prefilled user data, submit, and verify list + details page (19 checkpoints).'
    );
    await allure.parameter('category', CATEGORY);
    await allure.parameter('baseUrl', BASE_URL);

    const runId = Date.now();
    const title = process.env.SUPPORT_TICKET_TITLE || `Automated ${CATEGORY.toLowerCase()} support ${runId}`;
    const message = process.env.SUPPORT_TICKET_MESSAGE
      || `Automated ${CATEGORY.toLowerCase()} support message ${runId}: the feature is not working properly.`;

    const auth = new AuthPage(page, BASE_URL);
    const support = new SupportTicketsPage(page, BASE_URL);

    await allure.step('1. Open sign-in page', async () => {
      await auth.openSignIn();
      console.log('✅ 1. Sign-in page opened: PASSED');
    });

    await allure.step('2. Login with valid credentials', async () => {
      await auth.login(EMAIL, PASSWORD);
      await expect(page).not.toHaveURL(/\/en\/sign-in(?:\?|$)/, { timeout: 20_000 });
      console.log('✅ 2. Login successful: PASSED');
    });

    await allure.step('3. Open Support tickets page', async () => {
      await support.open();
      console.log('✅ 3. Support tickets page opened: PASSED');
    });

    await allure.step('4. Verify Support heading', async () => {
      await expect(page.getByRole('heading', { name: /^support$/i })).toBeVisible();
      console.log('✅ 4. Support heading visible: PASSED');
    });

    await allure.step('5. Verify stats panel (Total / Pending / Resolved)', async () => {
      await expect(page.getByText(/total tickets/i)).toBeVisible();
      await expect(page.getByText(/pending/i).first()).toBeVisible();
      await expect(page.getByText(/resolved/i).first()).toBeVisible();
      console.log('✅ 5. Stats panel (Total / Pending / Resolved) visible: PASSED');
    });

    await allure.step('6. Verify New Ticket button', async () => {
      await expect(page.getByRole('button', { name: /new ticket/i })).toBeVisible();
      console.log('✅ 6. New Ticket button visible: PASSED');
    });

    let createHeading;
    await allure.step('7. Open Create Support Ticket form', async () => {
      createHeading = await support.openNewTicketForm();
      console.log('✅ 7. Create Support Ticket form opened: PASSED');
    });

    await allure.step('8–9. Verify Full Name & Email prefill', async () => {
      const { fullNameValue, emailValue } = await support.expectPrefill();
      await allure.parameter('prefilledFullName', fullNameValue);
      await allure.parameter('prefilledEmail', emailValue);
      console.log(`✅ 8. Full Name pre-filled ("${fullNameValue}"): PASSED`);
      console.log(`✅ 9. Email pre-filled ("${emailValue}"): PASSED`);
    });

    await allure.step('10. Fill phone number', async () => {
      await support.fillTicket({ phone: PHONE });
      console.log(`✅ 10. Phone filled ("${PHONE}"): PASSED`);
    });

    await allure.step('11. Verify Category dropdown visible', async () => {
      await expect(page.getByRole('combobox', { name: /category/i })).toBeVisible();
      console.log('✅ 11. Category dropdown visible: PASSED');
    });

    await allure.step(`12. Select category "${CATEGORY}"`, async () => {
      await support.fillTicket({ category: CATEGORY });
      console.log(`✅ 12. Category "${CATEGORY}" selected: PASSED`);
    });

    await allure.step('13. Fill Ticket Title', async () => {
      await support.fillTicket({ title });
      await allure.parameter('ticketTitle', title);
      console.log('✅ 13. Ticket Title filled: PASSED');
    });

    await allure.step('14. Fill Problem Description', async () => {
      await support.fillTicket({ message });
      console.log('✅ 14. Problem Description filled: PASSED');
    });

    await allure.step('15. Verify Submit Ticket button enabled', async () => {
      await expect(support.submitButton()).toBeVisible();
      await expect(support.submitButton()).toBeEnabled();
      console.log('✅ 15. Submit Ticket button enabled: PASSED');
    });

    await allure.step('16. Submit ticket and close form', async () => {
      await support.submitTicket(createHeading);
      console.log('✅ 16. Ticket submitted — form closed: PASSED');
    });

    await allure.step('17–18. Open ticket from list (Open/Pending)', async () => {
      await support.openTicketDetails(title);
      console.log('✅ 17. Ticket visible in list with Open/Pending status: PASSED');
      console.log('✅ 18. Ticket details page opened: PASSED');
    });

    await allure.step('19. Verify title & message on details page', async () => {
      await support.expectTicketDetails(title, message);
      console.log('✅ 19. Title & message verified on details page: PASSED');
    });

    console.log('\n🎉 POSITIVE — all 19 checkpoints PASSED');
  });

  test('❌ NEGATIVE 1 — Submit button disabled when Ticket Title is empty', async ({ page }) => {
    test.setTimeout(60_000);
    page.setDefaultTimeout(15_000);

    await allure.severity('normal');
    await allure.story('Validation — empty ticket title blocks submit');
    await allure.description('Submit remains disabled when Ticket Title is empty.');
    await allure.tags('negative', 'validation');

    const auth = new AuthPage(page, BASE_URL);
    const support = new SupportTicketsPage(page, BASE_URL);

    await allure.step('Login and open new ticket form', async () => {
      await auth.login(EMAIL, PASSWORD);
      await support.open();
      await support.openNewTicketForm();
    });

    await allure.step('Fill phone, category, message — leave title empty', async () => {
      await support.fillTicket({
        phone: PHONE,
        category: CATEGORY,
        message: 'Test description for negative test',
      });
    });

    await allure.step('Assert Submit button is disabled', async () => {
      await expect(support.submitButton()).toBeDisabled({ timeout: 5_000 });
      console.log('✅ NEGATIVE 1 — Submit button disabled when Ticket Title is empty: PASSED');
    });

    await allure.step('Close form if still open', async () => {
      await support.closeFormIfOpen();
    });
  });

  test('❌ NEGATIVE 2 — Submit button disabled when Problem Description is empty', async ({ page }) => {
    test.setTimeout(60_000);
    page.setDefaultTimeout(15_000);

    await allure.severity('normal');
    await allure.story('Validation — empty problem description blocks submit');
    await allure.description('Submit remains disabled when Problem Description is empty.');
    await allure.tags('negative', 'validation');

    const auth = new AuthPage(page, BASE_URL);
    const support = new SupportTicketsPage(page, BASE_URL);

    await allure.step('Login and open new ticket form', async () => {
      await auth.login(EMAIL, PASSWORD);
      await support.open();
      await support.openNewTicketForm();
    });

    await allure.step('Fill phone, category, title — leave description empty', async () => {
      await support.fillTicket({
        phone: PHONE,
        category: CATEGORY,
        title: 'Negative test ticket title',
      });
    });

    await allure.step('Assert Submit button is disabled', async () => {
      await expect(support.submitButton()).toBeDisabled({ timeout: 5_000 });
      console.log('✅ NEGATIVE 2 — Submit button disabled when Problem Description is empty: PASSED');
    });

    await allure.step('Close form if still open', async () => {
      await support.closeFormIfOpen();
    });
  });

  test('❌ NEGATIVE 3 — Submit button disabled when Category is not selected', async ({ page }) => {
    test.setTimeout(60_000);
    page.setDefaultTimeout(15_000);

    await allure.severity('normal');
    await allure.story('Validation — missing category blocks submit');
    await allure.description('Submit remains disabled when Category is not selected.');
    await allure.tags('negative', 'validation');

    const auth = new AuthPage(page, BASE_URL);
    const support = new SupportTicketsPage(page, BASE_URL);

    await allure.step('Login and open new ticket form', async () => {
      await auth.login(EMAIL, PASSWORD);
      await support.open();
      await support.openNewTicketForm();
    });

    await allure.step('Fill phone, title, message — leave category empty', async () => {
      await support.fillTicket({
        phone: PHONE,
        title: 'Negative test — no category',
        message: 'Testing with no category selected',
      });
    });

    await allure.step('Assert Submit button is disabled', async () => {
      await expect(support.submitButton()).toBeDisabled({ timeout: 5_000 });
      console.log('✅ NEGATIVE 3 — Submit button disabled when Category not selected: PASSED');
    });

    await allure.step('Close form if still open', async () => {
      await support.closeFormIfOpen();
    });
  });

  test('❌ NEGATIVE 4 — Close button dismisses form without submitting', async ({ page }) => {
    test.setTimeout(60_000);
    page.setDefaultTimeout(15_000);

    await allure.severity('normal');
    await allure.story('Cancel create-ticket form without submitting');
    await allure.description('Closing/escaping the form must not create a new ticket.');
    await allure.tags('negative', 'cancel');

    const auth = new AuthPage(page, BASE_URL);
    const support = new SupportTicketsPage(page, BASE_URL);

    let ticketsBefore;
    await allure.step('Login, open Support, count existing tickets', async () => {
      await auth.login(EMAIL, PASSWORD);
      await support.open();
      ticketsBefore = await support.ticketRowCount();
    });

    await allure.step('Open form, fill fields, dismiss without submit', async () => {
      await support.openNewTicketForm();
      await support.fillTicket({
        title: 'This ticket should NOT be submitted',
        message: 'Cancelled before submit',
      });
      await support.dismissFormWithoutSubmit();
      console.log('✅ NEGATIVE 4 — Close/Escape dismissed form without submitting: PASSED');
    });

    await allure.step('Assert ticket list count unchanged', async () => {
      const ticketsAfter = await support.ticketRowCount();
      expect(ticketsAfter, 'No new ticket row should be added').toBeLessThanOrEqual(ticketsBefore);
      console.log('✅ NEGATIVE 4 — Ticket list count unchanged after cancel: PASSED');
    });
  });
});

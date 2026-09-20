const { test } = require('@playwright/test');
const allure = require('allure-js-commons');
const { AuthPage } = require('../pages/AuthPage');
const { ProjectsPage } = require('../pages/ProjectsPage');

const EMAIL = process.env.AUNGSHA_EMAIL;
const PASSWORD = process.env.AUNGSHA_PASSWORD;

test.describe('Projects — Project Details', () => {
  test('open the prebook project details page', async ({ page }) => {
    await allure.epic('Aungsha Staging');
    await allure.feature('Projects');
    await allure.story('Open Purbachal Hill City project details / checkout');
    await allure.severity('normal');
    await allure.owner('QA Automation');
    await allure.tags('projects', 'details', 'staging');
    await allure.description('Logs in and opens the Purbachal Hill City project action/checkout page.');

    const auth = new AuthPage(page);
    const projects = new ProjectsPage(page);

    await allure.step('1. Open sign-in page', async () => {
      await auth.openSignIn();
      console.log('✅ Sign-in page opened: PASSED');
    });

    await allure.step('2. Login with valid credentials', async () => {
      await auth.handleCookieConsent();
      await auth.fillCredentials(EMAIL, PASSWORD);
      await auth.submitLogin();
      console.log('✅ Login successful: PASSED');
    });

    await allure.step('3. Open Projects page', async () => {
      await projects.open();
      console.log('✅ Projects page opened: PASSED');
    });

    await allure.step('4. Open Purbachal Hill City checkout', async () => {
      const href = await projects.openPurbachalCheckout();
      await allure.parameter('projectHref', href);
      console.log(`✅ Purbachal Hill City action link found (${href}): PASSED`);
      console.log('✅ Purbachal Hill City checkout page opened: PASSED');
    });
  });
});

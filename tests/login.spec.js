const { test } = require('@playwright/test');
const allure = require('allure-js-commons');
const { AuthPage } = require('../pages/AuthPage');

const EMAIL = process.env.AUNGSHA_EMAIL;
const PASSWORD = process.env.AUNGSHA_PASSWORD;

test.describe('Authentication — Login', () => {
  test('log in to Aungsha with email', async ({ page }) => {
    await allure.epic('Aungsha Staging');
    await allure.feature('Authentication');
    await allure.story('Login with email and password');
    await allure.severity('critical');
    await allure.owner('QA Automation');
    await allure.tags('login', 'auth', 'staging');
    await allure.description('Validates email/password login on Aungsha staging.');

    const auth = new AuthPage(page);

    await allure.step('Login with email credentials', async () => {
      await auth.loginSimple(EMAIL, PASSWORD);
    });
  });
});

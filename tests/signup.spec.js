const { test } = require('@playwright/test');
const allure = require('allure-js-commons');
const { SignUpPage } = require('../pages/SignUpPage');

const EMAIL = process.env.AUNGSHA_EMAIL;
const PASSWORD = process.env.AUNGSHA_PASSWORD;

test.describe('Authentication — Sign Up', () => {
  test('create an Aungsha account with email', async ({ page }) => {
    await allure.epic('Aungsha Staging');
    await allure.feature('Authentication');
    await allure.story('Create account with email');
    await allure.severity('critical');
    await allure.owner('QA Automation');
    await allure.tags('signup', 'auth', 'staging');
    await allure.description('Creates a new Aungsha account using email signup.');

    const signUp = new SignUpPage(page);

    await allure.step('Open sign-up page', async () => {
      await signUp.open();
    });

    await allure.step('Create account with email', async () => {
      await signUp.createAccountWithEmail(EMAIL, PASSWORD);
    });
  });
});

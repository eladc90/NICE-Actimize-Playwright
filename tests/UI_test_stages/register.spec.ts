import { test } from '../../fixtures/parabank_fixtures';

test.describe('ParaBank registration', () => {
  test('registers a new user from the signup form', async ({ registrationData, registerPage }) => {
    await registerPage.registerNewCustomer(registrationData);
    await registerPage.assertHeadingHasUser(registrationData.username);
  });
});

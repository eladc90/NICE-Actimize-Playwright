import { test, expect } from '../../fixtures/parabank_fixtures';

test.describe('ParaBank registration', () => {
  test('registers a new user from the signup form', async ({ page, registrationData, registerPage }) => {
    await registerPage.registerNewCustomer(registrationData);
    await expect(page.getByRole('heading', { name: new RegExp(registrationData.username, 'i') })).toBeVisible();
  });
});

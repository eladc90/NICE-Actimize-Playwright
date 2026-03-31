import { test } from '../../fixtures/parabank_fixtures';

test.describe('Logout', () => {
  test('Log Out returns to Customer Login on index.htm', async ({
    homePage,
    overviewPage,
    registerPage,
    registrationData,
  }) => {
    await registerPage.registerNewCustomer(registrationData);

    await homePage.openHome();
    await homePage.assertHomeOrLogin();
    await homePage.loginThroughFormIfShown(registrationData.username, registrationData.password);
    await homePage.assertAccountServices();

    await overviewPage.logOut();

    await homePage.assertLoggedOutHome();
  });
});

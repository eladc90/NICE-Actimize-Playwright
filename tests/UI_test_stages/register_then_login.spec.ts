import { test } from '../../fixtures/parabank_fixtures';

test.describe('Register then login with the same user', () => {
  test('after UI signup, login from home reaches Account Services and overview', async ({
    homePage,
    overviewPage,
    uiRegisteredCustomer,
  }) => {
    await homePage.openHome();
    /** After UI signup, the demo may already be logged in on `index.htm` (no username field — raw `login()` would time out). */
    await homePage.assertHomeOrLogin();
    await homePage.loginThroughFormIfShown(
      uiRegisteredCustomer.username,
      uiRegisteredCustomer.password,
    );
    await homePage.assertAccountServices();

    await homePage.assertWelcomeCustomer(uiRegisteredCustomer.firstName, uiRegisteredCustomer.lastName);

    await overviewPage.goToAccountsOverviewViaNav();
    await overviewPage.assertOnOverview();
  });
});

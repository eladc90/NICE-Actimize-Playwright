import { test, expect } from '../../fixtures/parabank_fixtures';
import type { ParabankRegistrationData } from '../../pages_ui/register_page';

function regExpEscape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Same browser user: register once, then log in on the main page using those credentials.
 * `test.describe.serial` + a shared `let` is how you pass data between tests (fixtures alone give a new `registrationData` per test).
 */
test.describe.serial('Register then login with the same user', () => {
  let registeredUser!: ParabankRegistrationData;

  test('register new account', async ({ registrationData, registerPage }) => {
    await registerPage.registerNewCustomer(registrationData);
    registeredUser = registrationData;
  });

  test('login from home with saved credentials', async ({ page, homePage, overviewPage }) => {
    await homePage.openHome();
    await homePage.login(registeredUser.username, registeredUser.password);

    const welcomeName = new RegExp(
      `Welcome\\s+${regExpEscape(registeredUser.firstName)}\\s+${regExpEscape(registeredUser.lastName)}`,
      'i',
    );
    await expect(page.getByText(welcomeName)).toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole('heading', { name: 'Account Services' })).toBeVisible({
      timeout: 15_000,
    });

    await overviewPage.goToAccountsOverviewViaNav();
    await expect(page).toHaveURL(/overview\.htm/i);
    await expect(overviewPage.accountsTable()).toBeVisible({ timeout: 15_000 });
  });
});

import { expect, test } from '../../fixtures/parabank_fixtures';
import type { ParabankRegistrationData } from '../../pages_ui/register_page';
import {
  parabankApiNewCheckingAccountIdFromCurl,
  parabankUiSessionAfterRegister,
  Utilities,
} from '../../utilities/utilities';

test.describe('ParaBank full journey (E2E)', () => {
  test.describe.configure({ mode: 'serial', timeout: 90_000 });

  const transferAmount = 25;

  let registration: ParabankRegistrationData;
  let customerId: string;
  let primaryAccountId: string;
  let newAccountId: string;
  let primaryBalBefore: number;
  let newBalBefore: number;

  test('1. Register new user', async ({ registerPage }) => {
    registration = Utilities.createUniqRegistrationData();
    await registerPage.registerNewCustomer(registration);
  });

  /**
   * **2.1** Unknown username on REST login (API cannot be emulated reliably on this demo’s web login for rejects).
   */
  test('2.1 Login with unknown user (API) — no customer id', async ({ parabankApi }) => {
    const unknownUser: string = `no_such_customer_${Date.now()}`;
    const result = await parabankApi.login(unknownUser, 'SomeBadPass!9');
    expect(result.customerId).toBeUndefined();
    if (result.ok) {
      expect(result.body.length).toBeGreaterThan(0);
      expect(result.body.toLowerCase()).toMatch(/error|invalid|fail|denied|not.*verified|exception|unknown/);
    } else {
      expect(result.status).toBeGreaterThanOrEqual(400);
    }
  });

  /**
   * **2.2** Empty password on web login — stay on login surface (complements 2.1 API negative).
   */
  test('2.2 Login with empty password (UI) — validation / rejected', async ({ homePage }) => {
    await homePage.openHome();
    await homePage.assertHomeOrLogin();
    await expect(homePage.usernameInput()).toBeVisible();
    await homePage.usernameInput().fill(registration.username);
    await homePage.passwordInput().fill('');
    await homePage.loginButton().click();
    await homePage.assertEmptyPasswordRejectedByFormValidation();
  });

  test('2. Login ', async ({ homePage }) => {
    await homePage.openHome();
    await homePage.assertHomeOrLogin();
    await homePage.loginThroughFormIfShown(registration.username, registration.password);
    await homePage.assertAccountServices();
  });

  test('3. Get the customer id', async ({ parabankApi }) => {
    const login = await parabankApi.login(registration.username, registration.password);
    if (login.customerId === undefined) {
      throw new Error('REST login did not return customer id');
    }
    customerId = login.customerId;
  });

  /**
   * **4.1** `GET /accounts/{accountId}` with an id that does not exist (or is implausibly large for this demo).
   */
  test('4.1 GET account — unknown account id (API)', async ({ parabankApi }) => {
    const nonExistentAccountId = 9_999_999_999;
    const response = await parabankApi.getAccount({ accountId: nonExistentAccountId });
    expect(response.ok(), 'GET /accounts/{id} must fail for a non-existent account').toBe(false);
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('4. Get existing account via api', async ({ parabankApi }) => {
    const cid = Number(customerId);
    const { status: listStatus, accounts } = await parabankApi.getCustomerAccountsParsed(cid);
    if (listStatus !== 200) {
      throw new Error(`GET customer accounts failed: HTTP ${listStatus}`);
    }
    if (accounts.length === 0) {
      throw new Error('No existing account to use as fromAccountId');
    }
    primaryAccountId = accounts[0]!.id;
    await parabankApi.assertGetAccountResponseForOwner(primaryAccountId, customerId);
  });

  test('5. Create new CHECKING account with CURL', async ({ parabankApi }) => {
    newAccountId = parabankApiNewCheckingAccountIdFromCurl(parabankApi, customerId, primaryAccountId);
    expect(newAccountId, 'new account id differs from primary').not.toBe(primaryAccountId);
  });

  test('6. Verify new account appears in UI', async ({ homePage, overviewPage, parabankApi }) => {
    await parabankUiSessionAfterRegister(homePage, registration);
    await overviewPage.goToAccountsOverviewViaNav();
    await overviewPage.assertOnOverview();
    await overviewPage.assertOverviewHasBothAccounts(primaryAccountId, newAccountId);

    const primaryParsedBefore = await parabankApi.getAccountParsed(Number(primaryAccountId));
    const newParsedBefore = await parabankApi.getAccountParsed(Number(newAccountId));
    primaryBalBefore = parabankApi.assertAccountParsedBalance(primaryParsedBefore, 'primary before transfer');
    newBalBefore = parabankApi.assertAccountParsedBalance(newParsedBefore, 'new CHECKING before transfer');
  });

  test('7. Transfer money between accounts using ui', async ({ homePage, transferFundsPage }) => {
    await parabankUiSessionAfterRegister(homePage, registration);
    await transferFundsPage.goToTransferFundsViaNav();
    await transferFundsPage.assertOnTransfer();
    await transferFundsPage.transferBetweenAccounts(primaryAccountId, newAccountId, transferAmount);
    await transferFundsPage.assertTransferOk();
  });

  test('8. Validate updated balances', async ({ parabankApi }) => {
    const primaryParsedAfter = await parabankApi.getAccountParsed(Number(primaryAccountId));
    const newParsedAfter = await parabankApi.getAccountParsed(Number(newAccountId));
    const primaryBalAfter = parabankApi.assertAccountParsedBalance(primaryParsedAfter, 'primary after transfer');
    const newBalAfter = parabankApi.assertAccountParsedBalance(newParsedAfter, 'new CHECKING after transfer');
    parabankApi.assertBalancesDeltaAfterTransfer(
      primaryBalBefore,
      newBalBefore,
      primaryBalAfter,
      newBalAfter,
      transferAmount,
    );
  });

  test('9. Logout', async ({ homePage, overviewPage }) => {
    await parabankUiSessionAfterRegister(homePage, registration);
    await overviewPage.goToAccountsOverviewViaNav();
    await overviewPage.logOut();
    await homePage.assertLoggedOutHome();
  });
});

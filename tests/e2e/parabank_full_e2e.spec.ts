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

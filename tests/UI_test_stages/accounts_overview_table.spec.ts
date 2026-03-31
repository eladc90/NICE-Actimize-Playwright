import { test } from '../../fixtures/parabank_fixtures';

test.describe('Accounts overview table', () => {
  test('parabankNewCheckingAccountUi — activity page, then overview lists new account', async ({
    overviewPage,
    parabankNewCheckingAccountUi,
  }) => {
    const { newAccountId } = parabankNewCheckingAccountUi;

    overviewPage.assertActivityUrl(newAccountId);
    await overviewPage.assertAccountIdOnPage(newAccountId);

    await overviewPage.goToAccountsOverviewViaNav();
    await overviewPage.assertOnOverview();
    await overviewPage.assertOverviewHasAccount(newAccountId);

    const rows = await overviewPage.getAccountsTableData();
    overviewPage.assertTableContainsAccount(rows, newAccountId);
  });
});

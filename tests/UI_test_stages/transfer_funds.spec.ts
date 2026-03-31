import { expect, test } from '../../fixtures/parabank_fixtures';
import {
  findOverviewRowForAccountId,
  moneyAmountsFromOverviewRow,
} from '../../utilities/parabank_overview_money';

test.describe('Transfer funds (UI)', () => {
  test('transfer from primary account to new CHECKING via transfer.htm', async ({
    overviewPage,
    transferFundsPage,
    parabankApi,
    parabankNewCheckingAccountUi,
  }) => {
    const { primaryAccountId, newAccountId } = parabankNewCheckingAccountUi;
    const transferAmount = 25;

    await overviewPage.goToAccountsOverviewViaNav();
    await overviewPage.assertOnOverview();
    await overviewPage.assertOverviewHasBothAccounts(primaryAccountId, newAccountId);

    const rowsBefore = await overviewPage.getAccountsTableData();
    const primaryRowBefore = findOverviewRowForAccountId(rowsBefore, primaryAccountId);
    const newRowBefore = findOverviewRowForAccountId(rowsBefore, newAccountId);
    expect(primaryRowBefore, 'overview row for primary account').toBeDefined();
    expect(newRowBefore, 'overview row for new CHECKING').toBeDefined();
    const primaryMoneyBefore = moneyAmountsFromOverviewRow(primaryRowBefore!);
    const newMoneyBefore = moneyAmountsFromOverviewRow(newRowBefore!);
    expect(primaryMoneyBefore.length, 'primary: Balance / Available columns').toBeGreaterThan(0);
    expect(newMoneyBefore.length, 'new account: Balance / Available columns').toBeGreaterThan(0);

    await transferFundsPage.goToTransferFundsViaNav();
    await transferFundsPage.assertOnTransfer();

    await transferFundsPage.transferBetweenAccounts(primaryAccountId, newAccountId, transferAmount);

    await transferFundsPage.assertTransferOk();

    await overviewPage.goToAccountsOverviewViaNav();
    await overviewPage.assertOnOverview();
    await overviewPage.assertOverviewHasBothAccounts(primaryAccountId, newAccountId);

    const rowsAfter = await overviewPage.getAccountsTableData();
    const primaryRowAfter = findOverviewRowForAccountId(rowsAfter, primaryAccountId);
    const newRowAfter = findOverviewRowForAccountId(rowsAfter, newAccountId);
    expect(primaryRowAfter).toBeDefined();
    expect(newRowAfter).toBeDefined();
    const primaryMoneyAfter = moneyAmountsFromOverviewRow(primaryRowAfter!);
    const newMoneyAfter = moneyAmountsFromOverviewRow(newRowAfter!);

    const primaryBalBefore = primaryMoneyBefore[0]!;
    const newBalBefore = newMoneyBefore[0]!;
    const primaryBalAfterUi = primaryMoneyAfter[0]!;
    const newBalAfterUi = newMoneyAfter[0]!;
    expect(primaryBalAfterUi).toBe(primaryBalBefore - transferAmount);
    expect(newBalAfterUi).toBe(newBalBefore + transferAmount);

    const primaryApi = await parabankApi.getAccountParsed(Number(primaryAccountId));
    expect(primaryApi.status).toBe(200);
    const primaryBalApi = Number.parseFloat(primaryApi.account?.balance ?? '');
    expect(Number.isNaN(primaryBalApi), 'API primary balance parse').toBe(false);
    expect(primaryBalApi, 'GET /accounts/{primary} balance matches overview Balance*').toBe(
      primaryBalAfterUi,
    );

    const newApi = await parabankApi.getAccountParsed(Number(newAccountId));
    expect(newApi.status).toBe(200);
    const newBalApi = Number.parseFloat(newApi.account?.balance ?? '');
    expect(Number.isNaN(newBalApi), 'API new account balance parse').toBe(false);
    expect(newBalApi, 'GET /accounts/{new} balance matches overview Balance*').toBe(newBalAfterUi);
  });
});

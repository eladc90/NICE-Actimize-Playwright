import { expect, test } from '../../fixtures/parabank_fixtures';

test.describe('Accounts overview table', () => {
  test('parabankNewCheckingAccountUi — activity page, then overview lists new account', async ({
    page,
    overviewPage,
    parabankNewCheckingAccountUi,
  }) => {
    const { newAccountId } = parabankNewCheckingAccountUi;

    await expect(page).toHaveURL(/activity\.htm/i);
    await expect(page.getByText(newAccountId, { exact: false }).first()).toBeVisible({
      timeout: 15_000,
    });

    await overviewPage.goToAccountsOverviewViaNav();
    await expect(page).toHaveURL(/overview\.htm/i);
    await expect(overviewPage.accountsTable()).toBeVisible({ timeout: 15_000 });
    await expect(overviewPage.accountRowContainingId(newAccountId)).toBeVisible();

    const rows = await overviewPage.getAccountsTableData();
    expect(
      rows.some((cells) => cells.some((c) => c.includes(newAccountId))),
      'parsed table should include the new account id',
    ).toBe(true);
  });
});

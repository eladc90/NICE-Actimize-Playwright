import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base_page';

/** One data row from {@link OverviewPage.getAccountsTableData}: cell texts left-to-right. */
export type OverviewAccountTableRow = string[];

/**
 * ParaBank **Accounts Overview** (`overview.htm`) — lists the logged-in customer’s accounts.
 *
 * Prefer {@link goToAccountsOverviewViaNav} after login so you follow the same path as a user (clicks **Accounts Overview** in the left nav).
 *
 * @see https://parabank.parasoft.com/parabank/overview.htm
 */
export class OverviewPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Opens `overview.htm` directly. Requires an authenticated session; otherwise ParaBank may show an error page.
   */
  async openOverview(): Promise<void> {
    await this.open('overview.htm');
  }

  /**
   * Left-hand **Accounts Overview** link (shown on customer pages after a successful login).
   */
  accountsOverviewLink(): Locator {
    return this.page.getByRole('link', { name: /accounts? overview/i });
  }

  /**
   * Clicks **Accounts Overview** and waits until the browser is on `overview.htm`.
   */
  async goToAccountsOverviewViaNav(): Promise<void> {
    await this.accountsOverviewLink().click();
    await this.page.waitForURL(/overview\.htm/i, { timeout: 15_000 });
  }

  /**
   * Accounts table on the overview page (ParaBank uses `id="accountTable"` in the stock app).
   */
  accountsTable(): Locator {
    return this.page.locator('#accountTable');
  }

  /**
   * Row in {@link accountsTable} whose visible text includes the account id (use to assert an account appears after creation).
   */
  accountRowContainingId(accountId: string | number): Locator {
    return this.accountsTable().getByRole('row').filter({ hasText: String(accountId) });
  }

  /**
   * From **Accounts Overview**, opens the **Account Activity** page for `accountId` (clicks the row’s account link).
   */
  async openAccountActivity(accountId: string | number): Promise<void> {
    await this.goToAccountsOverviewViaNav();
    const row = this.accountRowContainingId(accountId);
    const link = row.getByRole('link').first();
    await link.click();
    await this.page.waitForURL(/activity\.htm/i, { timeout: 15_000 });
  }

  /**
   * Reads **data** rows from {@link accountsTable}: each cell’s `innerText`, trimmed and normalized (NBSP → space).
   * Prefers ARIA `row` / `cell` (skips header `columnheader`), then falls back to `tbody tr` / `td`.
   */
  async getAccountsTableData(): Promise<OverviewAccountTableRow[]> {
    const table = this.accountsTable();
    await table.waitFor({ state: 'visible', timeout: 15_000 });

    const normalize = (raw: string): string =>
      raw.replace(/\u00a0/g, ' ').trim().replace(/\s+/g, ' ');

    const rowToCells = async (row: Locator): Promise<OverviewAccountTableRow | null> => {
      let cells = row.getByRole('cell');
      let cellCount = await cells.count();
      if (cellCount === 0) {
        cells = row.locator('td');
        cellCount = await cells.count();
      }
      if (cellCount === 0) {
        return null;
      }

      const texts: string[] = [];
      for (let j = 0; j < cellCount; j++) {
        texts.push(normalize(await cells.nth(j).innerText()));
      }
      return texts;
    };

    const byRole = table.getByRole('row');
    const roleCount = await byRole.count();
    const result: OverviewAccountTableRow[] = [];
    for (let i = 0; i < roleCount; i++) {
      const cells = await rowToCells(byRole.nth(i));
      if (cells !== null) {
        result.push(cells);
      }
    }

    if (result.length > 0) {
      return result;
    }

    const tbody = table.locator('tbody');
    const rows =
      (await tbody.count()) > 0 ? tbody.locator('tr') : table.locator('tr:has(td)');
    const rowCount = await rows.count();
    for (let i = 0; i < rowCount; i++) {
      const cells = await rowToCells(rows.nth(i));
      if (cells !== null) {
        result.push(cells);
      }
    }

    return result;
  }
}

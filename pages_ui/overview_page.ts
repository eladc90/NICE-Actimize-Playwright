import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base_page';

/** One data row from {@link OverviewPage.getAccountsTableData}: cell texts left-to-right. */
export type OverviewAccountTableRow = string[];

/**
 * ParaBank **Accounts Overview** (`overview.htm`) and related customer nav (Account Activity, Log Out).
 *
 * @see https://parabank.parasoft.com/parabank/overview.htm
 */
export class OverviewPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // —— Main actions ——

  /** Opens `overview.htm` (needs an authenticated session). */
  async openOverview(): Promise<void> {
    await this.open('overview.htm');
  }

  /** Clicks **Accounts Overview** in the left nav and waits for `overview.htm`. */
  async goToAccountsOverviewViaNav(): Promise<void> {
    await this.accountsOverviewLink().click();
    await this.page.waitForURL(/overview\.htm/i, { timeout: 15_000 });
  }

  /** Clicks **Log Out** and waits for `index.htm`. */
  async logOut(): Promise<void> {
    await this.logOutLink().click();
    await this.page.waitForURL(/index\.htm/i, { timeout: 15_000 });
  }

  /**
   * From **Accounts Overview**, opens **Account Activity** for `accountId` (row link → `activity.htm`).
   */
  async openAccountActivity(accountId: string | number): Promise<void> {
    await this.goToAccountsOverviewViaNav();
    const row = this.accountRowContainingId(accountId);
    const link = row.getByRole('link').first();
    await link.click();
    await this.page.waitForURL(/activity\.htm/i, { timeout: 15_000 });
  }

  /**
   * Reads accounts **#accountTable** body: trimmed cell texts per row (ARIA rows preferred, then `tbody tr` / `td` fallback).
   */
  async getAccountsTableData(): Promise<OverviewAccountTableRow[]> {
    const table = this.accountsTable();
    await table.waitFor({ state: 'visible', timeout: 15_000 });

    const byRole = table.getByRole('row');
    const roleCount = await byRole.count();
    const result: OverviewAccountTableRow[] = [];
    for (let i = 0; i < roleCount; i++) {
      const cells = await this.rowToCells(byRole.nth(i));
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
      const cells = await this.rowToCells(rows.nth(i));
      if (cells !== null) {
        result.push(cells);
      }
    }

    return result;
  }

  // —— Locators ——

  accountsOverviewLink(): Locator {
    return this.page.getByRole('link', { name: /accounts? overview/i });
  }

  logOutLink(): Locator {
    return this.page.getByRole('link', { name: /log out/i });
  }

  accountsTable(): Locator {
    return this.page.locator('#accountTable');
  }

  accountRowContainingId(accountId: string | number): Locator {
    return this.accountsTable().getByRole('row').filter({ hasText: String(accountId) });
  }

  // —— Assertions ——

  async assertOnOverview(timeout = 15_000): Promise<void> {
    await expect(this.page).toHaveURL(/overview\.htm/i);
    await expect(this.accountsTable()).toBeVisible({ timeout });
  }

  async assertOverviewHasBothAccounts(
    accountIdA: string | number,
    accountIdB: string | number,
    timeout = 15_000,
  ): Promise<void> {
    await expect(this.accountRowContainingId(accountIdA)).toBeVisible({ timeout });
    await expect(this.accountRowContainingId(accountIdB)).toBeVisible({ timeout });
  }

  async assertOverviewHasAccount(accountId: string | number, timeout = 15_000): Promise<void> {
    await expect(this.accountRowContainingId(accountId)).toBeVisible({ timeout });
  }

  /** `activity.htm` path and `id` query match **accountId**. */
  assertActivityUrl(accountId: string | number): void {
    const activityUrl = new URL(this.page.url());
    expect(
      activityUrl.pathname,
      'Account Activity path should end with activity.htm',
    ).toMatch(/activity\.htm$/i);
    expect(
      activityUrl.searchParams.get('id'),
      'Account Activity URL should include id query matching the account',
    ).toBe(String(accountId));
  }

  async assertAccountIdOnPage(accountId: string | number, timeout = 15_000): Promise<void> {
    await expect(this.page.getByText(String(accountId), { exact: false }).first()).toBeVisible({
      timeout,
    });
  }

  assertTableContainsAccount(
    rows: OverviewAccountTableRow[],
    accountId: string | number,
  ): void {
    const id = String(accountId);
    expect(
      rows.some((cells) => cells.some((cell) => cell.includes(id))),
      `Parsed overview table should include account id ${id} in at least one cell`,
    ).toBe(true);
  }

  // —— Private ——

  private normalizeCellText(raw: string): string {
    return raw.replace(/\u00a0/g, ' ').trim().replace(/\s+/g, ' ');
  }

  private async rowToCells(row: Locator): Promise<OverviewAccountTableRow | null> {
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
      texts.push(this.normalizeCellText(await cells.nth(j).innerText()));
    }
    return texts;
  }
}

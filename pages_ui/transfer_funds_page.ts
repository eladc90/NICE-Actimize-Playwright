import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base_page';

/**
 * ParaBank **Transfer Funds** (`transfer.htm`).
 *
 * @see https://parabank.parasoft.com/parabank/transfer.htm
 */
export class TransferFundsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // —— Main actions ——

  async openTransfer(): Promise<void> {
    await this.open('transfer.htm');
  }

  async goToTransferFundsViaNav(): Promise<void> {
    await this.transferFundsNavLink().click();
    await this.page.waitForURL(/transfer\.htm/i, { timeout: 15_000 });
  }

  /**
   * Chooses **from** / **to** accounts, amount, and submits **Transfer** (IDs must match `<option value="…">` on the page).
   */
  async transferBetweenAccounts(
    fromAccountId: string | number,
    toAccountId: string | number,
    amount: string | number,
  ): Promise<void> {
    await this.fromAccountSelect().selectOption(String(fromAccountId));
    await this.toAccountSelect().selectOption(String(toAccountId));
    await this.amountInput().fill(String(amount));
    await this.transferSubmitButton().click();
  }

  // —— Locators ——

  transferFundsNavLink(): Locator {
    return this.page.getByRole('link', { name: /transfer funds/i });
  }

  fromAccountSelect(): Locator {
    return this.page.locator('#fromAccountId');
  }

  toAccountSelect(): Locator {
    return this.page.locator('#toAccountId');
  }

  amountInput(): Locator {
    return this.page.locator('#amount');
  }

  transferSubmitButton(): Locator {
    return this.page.getByRole('button', { name: /^transfer$/i });
  }

  // —— Assertions ——

  async assertOnTransfer(): Promise<void> {
    await expect(this.page).toHaveURL(/transfer\.htm/i);
  }

  /** Post-submit success / scheduled banner (wording varies). */
  async assertTransferOk(timeout = 20_000): Promise<void> {
    await expect(
      this.page.getByText(/transfer complete|has been scheduled|successfully/i).first(),
    ).toBeVisible({ timeout });
  }
}

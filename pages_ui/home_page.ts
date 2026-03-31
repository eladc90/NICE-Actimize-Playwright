import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base_page';

/**
 * ParaBank home / login area (`index.htm`). Locators match Playwright codegen against the live site.
 */
export class HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // —— Main actions ——

  /** Opens the customer login landing page (`index.htm`). */
  async openHome(): Promise<void> {
    await this.open('index.htm');
  }

  /** Submits the **Customer Login** form (username + password + Log In). */
  async login(username: string, password: string): Promise<void> {
    await this.usernameInput().fill(username);
    await this.passwordInput().fill(password);
    await this.loginButton().click();
  }

  /**
   * If the login form is shown after signup, submits it; otherwise assumes the app already shows an authenticated shell.
   * After a successful login through the form, asserts **Account Services** is visible.
   */
  async loginThroughFormIfShown(username: string, password: string): Promise<void> {
    if (await this.usernameInput().isVisible()) {
      await this.login(username, password);
      await this.assertAccountServices();
    }
  }

  // —— Locators (customer login & nav) ——

  /** **Account Services** heading (authenticated customer chrome). */
  accountServicesHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Account Services' });
  }

  usernameInput(): Locator {
    return this.page.locator('input[name="username"]');
  }

  passwordInput(): Locator {
    return this.page.locator('input[name="password"]');
  }

  loginButton(): Locator {
    return this.page.getByRole('button', { name: 'Log In' });
  }

  registerLink(): Locator {
    return this.page.getByRole('link', { name: 'Register' });
  }

  // —— Assertions ——

  /**
   * After registration, `index.htm` may show either the **Customer Login** form or the authenticated **Account Services** area — wait until one of them is visible.
   */
  async assertHomeOrLogin(timeout = 20_000): Promise<void> {
    await expect(this.accountServicesHeading().or(this.usernameInput())).toBeVisible({ timeout });
  }

  /** **Account Services** heading (authenticated customer chrome). */
  async assertAccountServices(timeout = 15_000): Promise<void> {
    await expect(this.accountServicesHeading()).toBeVisible({ timeout });
  }

  /** `Welcome <firstName> <lastName>`. */
  async assertWelcomeCustomer(firstName: string, lastName: string, timeout = 15_000): Promise<void> {
    const welcomePattern = new RegExp(
      `Welcome\\s+${HomePage.regExpEscape(firstName)}\\s+${HomePage.regExpEscape(lastName)}`,
      'i',
    );
    await expect(this.page.getByText(welcomePattern)).toBeVisible({ timeout });
  }

  /** Logged-out: `index.htm`, login field visible, no **Account Services**. */
  async assertLoggedOutHome(timeout = 15_000): Promise<void> {
    await expect(this.page).toHaveURL(/index\.htm/i);
    await expect(this.usernameInput()).toBeVisible({ timeout });
    await expect(this.accountServicesHeading()).not.toBeVisible();
  }

  // —— Private ——

  private static regExpEscape(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base_page';

/**
 * ParaBank home / login area. Locators below match Playwright codegen against the live site.
 */
export class HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Customer login landing page (`index.htm`). */
  async openHome(): Promise<void> {
    await this.open('index.htm');
  }

  /** Fills the main Customer Login form and submits (same fields as codegen on `index.htm`). */
  async login(username: string, password: string): Promise<void> {
    await this.usernameInput().fill(username);
    await this.passwordInput().fill(password);
    await this.loginButton().click();
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
}

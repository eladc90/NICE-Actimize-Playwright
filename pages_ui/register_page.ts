import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base_page';

/** Values for each field in `#customerForm` on `register.htm`. */
export type ParabankRegistrationData = {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  ssn: string;
  username: string;
  password: string;
  /** Must match `password` when the app requires confirmation. */
  confirmPassword: string;
};

/**
 * ParaBank signup (`register.htm`).
 *
 * @see https://parabank.parasoft.com/parabank/register.htm
 */
export class RegisterPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // —— Main actions ——

  async openRegister(): Promise<void> {
    await this.open('register.htm');
  }

  /** Opens signup, fills `#customerForm`, submits, and waits for the success banner. */
  async registerNewCustomer(data: ParabankRegistrationData): Promise<void> {
    await this.openRegister();
    await this.page.waitForLoadState('domcontentloaded');
    await this.fillAndRegister(data);
    await this.assertSignupSuccess();
  }

  /** Fills all signup fields and submits the form. */
  async fillAndRegister(data: ParabankRegistrationData): Promise<void> {
    const form = this.formRoot();
    await form.waitFor({ state: 'visible' });

    await this.firstNameInput().fill(data.firstName);
    await this.lastNameInput().fill(data.lastName);
    await this.streetInput().fill(data.street);
    await this.cityInput().fill(data.city);
    await this.stateInput().fill(data.state);
    await this.zipCodeInput().fill(data.zipCode);
    await this.phoneInput().fill(data.phone);
    await this.ssnInput().fill(data.ssn);
    await this.usernameInput().fill(data.username);
    await this.passwordInput().fill(data.password);
    await this.confirmPasswordInput().fill(data.confirmPassword);

    /**
     * `input type="submit"` + shared demo latency: default `click()` may wait for navigation that Firefox
     * does not settle promptly. `noWaitAfter` + {@link assertSignupSuccess} matches how we really assert done.
     */
    await this.registerSubmit().click({
      noWaitAfter: true,
      timeout: 45_000,
    });
  }

  // —— Locators ——

  firstNameInput(): Locator {
    return this.formRoot().locator('input[name="customer.firstName"]');
  }

  lastNameInput(): Locator {
    return this.formRoot().locator('input[name="customer.lastName"]');
  }

  streetInput(): Locator {
    return this.formRoot().locator('input[name="customer.address.street"]');
  }

  cityInput(): Locator {
    return this.formRoot().locator('input[name="customer.address.city"]');
  }

  stateInput(): Locator {
    return this.formRoot().locator('input[name="customer.address.state"]');
  }

  zipCodeInput(): Locator {
    return this.formRoot().locator('input[name="customer.address.zipCode"]');
  }

  phoneInput(): Locator {
    return this.formRoot().locator('input[name="customer.phoneNumber"]');
  }

  ssnInput(): Locator {
    return this.formRoot().locator('input[name="customer.ssn"]');
  }

  usernameInput(): Locator {
    return this.formRoot().locator('input[name="customer.username"]');
  }

  passwordInput(): Locator {
    return this.formRoot().locator('input[name="customer.password"]');
  }

  confirmPasswordInput(): Locator {
    return this.formRoot().locator('input[name="repeatedPassword"]');
  }

  /** Native submit control — `getByRole('button')` can be flaky vs `input[type="submit"]` in Firefox. */
  registerSubmit(): Locator {
    return this.formRoot().locator('input[type="submit"][value="Register"]');
  }

  // —— Assertions ——

  async assertSignupSuccess(timeout = 40_000): Promise<void> {
    await expect(this.page.getByText('Your account was created successfully.')).toBeVisible({
      timeout,
    });
  }

  async assertHeadingHasUser(username: string, timeout = 15_000): Promise<void> {
    await expect(this.page.getByRole('heading', { name: new RegExp(username, 'i') })).toBeVisible({
      timeout,
    });
  }

  // —— Private ——

  private formRoot(): Locator {
    return this.page.locator('#customerForm');
  }
}

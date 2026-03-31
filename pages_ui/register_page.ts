import type { Locator, Page } from '@playwright/test';
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
 * ParaBank signup form (`register.htm`). Locators use the `customerForm` markup from
 * https://parabank.parasoft.com/parabank/register.htm (verified via live HTML).
 */
export class RegisterPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async openRegister(): Promise<void> {
    await this.open('register.htm');
  }

  /**
   * Full UI signup: open `register.htm`, submit the form, wait for the success banner.
   * Same path as manual registration in the ParaBank web app.
   */
  async registerNewCustomer(data: ParabankRegistrationData): Promise<void> {
    await this.openRegister();
    await this.fillAndRegister(data);
    await this.page.getByText('Your account was created successfully.').waitFor({
      state: 'visible',
      timeout: 30_000,
    });
  }

  /** Fills every signup field and clicks Register. */
  async fillAndRegister(data: ParabankRegistrationData): Promise<void> {
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
    await this.registerSubmit().click();
  }

  private formRoot(): Locator {
    return this.page.locator('#customerForm');
  }

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

  registerSubmit(): Locator {
    return this.formRoot().getByRole('button', { name: 'Register' });
  }
}

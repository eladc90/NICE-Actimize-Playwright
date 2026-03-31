import { test as base } from '@playwright/test';
import type { ParabankRegistrationData } from '../pages_ui/register_page';
import { RegisterPage } from '../pages_ui/register_page';
import { HomePage } from '../pages_ui/home_page';
import { OverviewPage } from '../pages_ui/overview_page';
import { TransferFundsPage } from '../pages_ui/transfer_funds_page';
import { ParabankApiClient } from '../api_request/parabank_api_client';
import {
  parabankApiLoginCustomerId,
  parabankApiNewCheckingAccountIdFromCurl,
  parabankApiPrimaryAccountId,
  parabankUiSessionAfterRegister,
  provisionParabankApiUser,
  type ParabankProvisionedApiUser,
  Utilities,
} from '../utilities/utilities';

export type ParabankNewCheckingAccountUi = {
  registration: ParabankRegistrationData;
  customerId: string;
  primaryAccountId: string;
  newAccountId: string;
};

export type ParabankCoreFixtures = {
  registrationData: ParabankRegistrationData;
  uiRegisteredCustomer: ParabankRegistrationData;
  registerPage: RegisterPage;
  homePage: HomePage;
  overviewPage: OverviewPage;
  transferFundsPage: TransferFundsPage;
  parabankApi: ParabankApiClient;
  parabankNewCheckingAccountUi: ParabankNewCheckingAccountUi;
};

/** All fixtures available from {@link test} (core + `parabankApiUser`). */
export type ParabankFixtures = ParabankCoreFixtures & {
  /**
   * Registers via the **Register** UI (`register.htm`), then logs in via REST and ensures at least one bank account exists.
   * For API tests that must not rely on a shared hard-coded demo user.
   */
  parabankApiUser: ParabankProvisionedApiUser;
};

const testCore = base.extend<ParabankCoreFixtures>({
  registrationData: async ({}, use) => {
    await use(Utilities.createUniqRegistrationData());
  },

  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },

  uiRegisteredCustomer: async ({ registerPage }, use) => {
    const registration = Utilities.createUniqRegistrationData();
    await registerPage.registerNewCustomer(registration);
    await use(registration);
  },

  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },

  overviewPage: async ({ page }, use) => {
    await use(new OverviewPage(page));
  },

  transferFundsPage: async ({ page }, use) => {
    await use(new TransferFundsPage(page));
  },

  parabankApi: async ({ request }, use) => {
    await use(new ParabankApiClient(request));
  },

  parabankNewCheckingAccountUi: async (
    { registerPage, homePage, overviewPage, parabankApi },
    use,
  ) => {
    const registration = Utilities.createUniqRegistrationData();
    await registerPage.registerNewCustomer(registration);
    await parabankUiSessionAfterRegister(homePage, registration);

    const customerId = await parabankApiLoginCustomerId(
      parabankApi,
      registration.username,
      registration.password,
    );
    const primaryAccountId = await parabankApiPrimaryAccountId(parabankApi, customerId);
    const newAccountId = parabankApiNewCheckingAccountIdFromCurl(parabankApi, customerId, primaryAccountId);

    await overviewPage.openAccountActivity(newAccountId);
    await use({ registration, customerId, primaryAccountId, newAccountId });
  },
});

export const test = testCore.extend<Pick<ParabankFixtures, 'parabankApiUser'>>({
  parabankApiUser: async ({ parabankApi, registerPage }, use) => {
    const registration = Utilities.createUniqRegistrationData();
    const user = await provisionParabankApiUser(parabankApi, registerPage, registration);
    await use(user);
  },
});

export { expect } from '@playwright/test';

import { test as base, expect } from '@playwright/test';
import type { ParabankRegistrationData } from '../pages_ui/register_page';
import { RegisterPage } from '../pages_ui/register_page';
import { HomePage } from '../pages_ui/home_page';
import { OverviewPage } from '../pages_ui/overview_page';
import { ParabankApiClient } from '../api_request/parabank_api_client';
import {
  ApiAssertions,
  expectedParabankCreateCheckingAccountResponse,
  Utilities,
} from '../utilities/utilities';

/**
 * Context after {@link ParabankCoreFixtures.parabankNewCheckingAccountUi}: UI signup, CHECKING created via curl, browser on **Account Activity** for the new account.
 */
export type ParabankNewCheckingAccountUi = {
  registration: ParabankRegistrationData;
  customerId: string;
  /** Account used as `fromAccountId` when calling `createCheckingAccountWithCurl`. */
  primaryAccountId: string;
  /** New CHECKING account id returned from the curl `POST /createAccount` call. */
  newAccountId: string;
};

export type ParabankCoreFixtures = {
  /** Fresh unique signup payload for this test (from {@link Utilities.createUniqRegistrationData}). */
  registrationData: ParabankRegistrationData;
  registerPage: RegisterPage;
  homePage: HomePage;
  /** Accounts overview (`overview.htm`) — use after login; {@link OverviewPage.goToAccountsOverviewViaNav} matches user navigation. */
  overviewPage: OverviewPage;
  /** REST client for `…/parabank/services/bank` (see Swagger UI in repo docs). */
  parabankApi: ParabankApiClient;
  /**
   * Registers via UI, ensures **Account Services**, creates a new CHECKING account via {@link ParabankApiClient.createCheckingAccountWithCurl},
   * then opens {@link OverviewPage.openAccountActivity} so the active page is **Account Activity** (`activity.htm`) for `newAccountId`.
   */
  parabankNewCheckingAccountUi: ParabankNewCheckingAccountUi;
};

/** Core ParaBank fixtures (UI + REST client) without provisioned API user. */
export const test = base.extend<ParabankCoreFixtures>({
  registrationData: async ({}, use) => {
    await use(Utilities.createUniqRegistrationData());
  },

  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },

  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },

  overviewPage: async ({ page }, use) => {
    await use(new OverviewPage(page));
  },

  parabankApi: async ({ request }, use) => {
    await use(new ParabankApiClient(request));
  },

  parabankNewCheckingAccountUi: async (
    { page, registerPage, homePage, overviewPage, parabankApi },
    use,
  ) => {
    const registration = Utilities.createUniqRegistrationData();
    await registerPage.registerNewCustomer(registration);

    await homePage.openHome();
    try {
      await homePage.usernameInput().waitFor({ state: 'visible', timeout: 8_000 });
      await homePage.login(registration.username, registration.password);
    } catch {
      /* ParaBank may already log the customer in after signup */
    }

    await expect(page.getByRole('heading', { name: 'Account Services' })).toBeVisible({
      timeout: 15_000,
    });

    const login = await parabankApi.login(registration.username, registration.password);
    if (login.customerId === undefined) {
      throw new Error('REST login did not return customer id');
    }
    const customerId = login.customerId;
    const cid = Number(customerId);

    const { status: listStatus, accounts } = await parabankApi.getCustomerAccountsParsed(cid);
    if (listStatus !== 200) {
      throw new Error(`GET customer accounts failed: HTTP ${listStatus}`);
    }
    if (accounts.length === 0) {
      throw new Error('No existing account to use as fromAccountId');
    }
    const primaryAccountId = accounts[0]!.id;

    const { statusCode, body } = parabankApi.createCheckingAccountWithCurl({
      customerId: cid,
      fromAccountId: Number(primaryAccountId),
    });
    ApiAssertions.assertApiResponseText(
      statusCode,
      body,
      expectedParabankCreateCheckingAccountResponse(customerId),
    );

    const parsed = ParabankApiClient.parseAccountBlocksFromXml(body);
    if (parsed.length !== 1 || !parsed[0]?.id) {
      throw new Error('Unexpected POST /createAccount response shape');
    }
    const newAccountId = parsed[0].id;

    await overviewPage.openAccountActivity(newAccountId);

    await use({ registration, customerId, primaryAccountId, newAccountId });
  },
});

export { expect } from '@playwright/test';

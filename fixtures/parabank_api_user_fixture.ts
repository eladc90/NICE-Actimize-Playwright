import { Utilities, provisionParabankApiUser, type ParabankProvisionedApiUser } from '../utilities/utilities';
import { expect, test as base } from './parabank_core_fixtures';
import type { ParabankCoreFixtures } from './parabank_core_fixtures';

export type ParabankFixtures = ParabankCoreFixtures & {
  /**
   * Registers via the **Register** UI (`register.htm`), then logs in via REST and ensures at least one bank account exists.
   * For API tests that must not rely on a shared hard-coded demo user.
   */
  parabankApiUser: ParabankProvisionedApiUser;
};

export const test = base.extend<Pick<ParabankFixtures, 'parabankApiUser'>>({
  parabankApiUser: async ({ parabankApi, registerPage }, use) => {
    const registration = Utilities.createUniqRegistrationData();
    const user = await provisionParabankApiUser(parabankApi, registerPage, registration);
    await use(user);
  },
});

export { expect };

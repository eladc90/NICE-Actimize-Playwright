import { PARABANK_ACCOUNT_TYPE_CHECKING, type ParabankApiClient } from '../api_request/parabank_api_client';
import type { ParabankRegistrationData, RegisterPage } from '../pages_ui/register_page';

export type ParabankProvisionedApiUser = {
  registration: ParabankRegistrationData;
  customerId: string;
  /** First bank account id (ParaBank usually creates one at registration; otherwise ensured via API). */
  primaryAccountId: string;
};

/**
 * Registers a fresh customer through the **UI** (`register.htm`), then logs in via REST and ensures at least one bank account exists.
 */
export async function provisionParabankApiUser(
  api: ParabankApiClient,
  registerPage: RegisterPage,
  registration: ParabankRegistrationData,
): Promise<ParabankProvisionedApiUser> {
  await registerPage.registerNewCustomer(registration);

  const login = await api.login(registration.username, registration.password);
  if (login.customerId === undefined) {
    throw new Error(
      `Login after registration did not return a customer id (HTTP ${login.status}). Body (truncated): ${login.body.slice(0, 400)}`,
    );
  }
  const { customerId } = login;

  const numericId = Number(customerId);
  const primaryAccountId = await ensureParabankPrimaryAccount(api, numericId);

  return { registration, customerId, primaryAccountId };
}

/**
 * ParaBank normally creates a default account on registration. If the list is empty, try `POST /createAccount`.
 */
async function ensureParabankPrimaryAccount(api: ParabankApiClient, customerId: number): Promise<string> {
  let { status, accounts } = await api.getCustomerAccountsParsed(customerId);
  if (status !== 200) {
    throw new Error(`GET customer accounts failed: HTTP ${status}`);
  }

  if (accounts.length > 0 && accounts[0]?.id) {
    return accounts[0].id;
  }

  const createResp = await api.createAccount({
    customerId,
    newAccountType: PARABANK_ACCOUNT_TYPE_CHECKING,
    fromAccountId: 0,
  });

  if (!createResp.ok()) {
    const snippet = (await createResp.text()).slice(0, 300);
    throw new Error(
      `Customer ${customerId} has no accounts and createAccount failed: HTTP ${createResp.status()} — ${snippet}`,
    );
  }

  ({ status, accounts } = await api.getCustomerAccountsParsed(customerId));
  if (status !== 200 || accounts.length === 0 || !accounts[0]?.id) {
    throw new Error(`Customer ${customerId} still has no accounts after createAccount`);
  }

  return accounts[0].id;
}

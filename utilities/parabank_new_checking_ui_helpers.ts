import type { ParabankApiClient } from '../api_request/parabank_api_client';
import type { HomePage } from '../pages_ui/home_page';
import type { ParabankRegistrationData } from '../pages_ui/register_page';

/** After UI `registerNewCustomer`: land on home, optional login, assert **Account Services**. */
export async function parabankUiSessionAfterRegister(
  homePage: HomePage,
  registration: ParabankRegistrationData,
): Promise<void> {
  await homePage.openHome();
  await homePage.assertHomeOrLogin();
  await homePage.loginThroughFormIfShown(registration.username, registration.password);
  await homePage.assertAccountServices();
}

/** REST login; throws if the XML has no customer id. */
export async function parabankApiLoginCustomerId(
  api: ParabankApiClient,
  username: string,
  password: string,
): Promise<string> {
  const login = await api.login(username, password);
  if (login.customerId === undefined) {
    throw new Error('REST login did not return customer id');
  }
  return login.customerId;
}

/** First listed account id for `fromAccountId`; throws if list is empty or request fails. */
export async function parabankApiPrimaryAccountId(
  api: ParabankApiClient,
  customerId: string,
): Promise<string> {
  const cid = Number(customerId);
  const { status: listStatus, accounts } = await api.getCustomerAccountsParsed(cid);
  if (listStatus !== 200) {
    throw new Error(`GET customer accounts failed: HTTP ${listStatus}`);
  }
  if (accounts.length === 0) {
    throw new Error('No existing account to use as fromAccountId');
  }
  return accounts[0]!.id;
}

/** `POST /createAccount` via curl with assertion + parsed new account id. */
export function parabankApiNewCheckingAccountIdFromCurl(
  api: ParabankApiClient,
  customerId: string,
  primaryAccountId: string,
): string {
  const curl = api.createCheckingAccountWithCurl({
    customerId: Number(customerId),
    fromAccountId: Number(primaryAccountId),
  });
  return api.assertCreateCheckingCurlResult(curl, customerId);
}

import { test } from '../../fixtures/parabank_fixtures';

/**
 * Serial: each test provisions a fresh user via `register.htm`. Running these in parallel against
 * the shared ParaBank host often yields flaky signups (login 400) even when POST returns 200.
 */
test.describe.serial('ParaBank API', () => {
  test.describe('customer ID', () => {
    test('login response — status, XML shape, and customer id field', async ({ parabankApi, parabankApiUser }) => {
      const { registration } = parabankApiUser;
      const response = await parabankApi.loginRequest(registration.username, registration.password);
      await parabankApi.assertLoginResponse(response, registration.firstName, registration.lastName);
    });

    test('getCustomer — status, XML structure, and id matches provisioned user', async ({
      parabankApi,
      parabankApiUser,
    }) => {
      const { customerId, registration } = parabankApiUser;
      const response = await parabankApi.getCustomer({ customerId: Number(customerId) });
      await parabankApi.assertGetCustomerResponse(response, customerId, registration.firstName);
    });
  });

  test.describe('existing account', () => {
    test('getAccount — status, XML structure, and ids align with customer accounts list', async ({
      parabankApi,
      parabankApiUser,
    }) => {
      const { customerId, primaryAccountId } = parabankApiUser;
      await parabankApi.assertListedPrimaryAccountMatchesGetAccount(customerId, primaryAccountId);
    });
  });

  test.describe('create checking account', () => {
    test('create CHECKING account via curl — GET /accounts/{id} confirms', async ({ parabankApi, parabankApiUser }) => {
      const { customerId, primaryAccountId } = parabankApiUser;

      const curl = parabankApi.createCheckingAccountWithCurl({
        customerId: Number(customerId),
        fromAccountId: Number(primaryAccountId),
      });
      const newAccountId = parabankApi.assertCreateCheckingCurlResult(curl, customerId, {
        newAccountMustDifferFrom: primaryAccountId,
      });
      await parabankApi.assertGetAccountResponseForOwner(newAccountId, customerId);
    });
  });

  test.describe('transfer', () => {
    test('POST /transfer — GET /accounts on both ids reflects balance delta', async ({
      parabankApi,
      parabankApiUser,
    }) => {
      const { customerId, primaryAccountId } = parabankApiUser;
      const cid = Number(customerId);
      const fromId = Number(primaryAccountId);

      const curl = parabankApi.createCheckingAccountWithCurl({
        customerId: cid,
        fromAccountId: fromId,
      });
      const toId = Number(parabankApi.assertCreateCheckingCurlResult(curl, customerId));

      const balFromBefore = parabankApi.assertAccountParsedBalance(
        await parabankApi.getAccountParsed(fromId),
        'from',
      );
      const balToBefore = parabankApi.assertAccountParsedBalance(await parabankApi.getAccountParsed(toId), 'to');

      const amount = 25;
      const transferResp = await parabankApi.transfer({
        fromAccountId: fromId,
        toAccountId: toId,
        amount,
      });
      parabankApi.assertTransferResponseOk(transferResp);

      const balFromAfter = parabankApi.assertAccountParsedBalance(await parabankApi.getAccountParsed(fromId), 'from');
      const balToAfter = parabankApi.assertAccountParsedBalance(await parabankApi.getAccountParsed(toId), 'to');

      parabankApi.assertBalancesDeltaAfterTransfer(balFromBefore, balToBefore, balFromAfter, balToAfter, amount);
    });
  });
});

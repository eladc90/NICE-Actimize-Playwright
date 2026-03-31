import { ParabankApiClient } from '../../api_request/parabank_api_client';
import { expect, test } from '../../fixtures/parabank_fixtures';
import {
  ApiAssertions,
  expectedParabankCreateCheckingAccountResponse,
  expectedParabankGetAccountResponse,
  expectedParabankGetCustomerResponse,
  expectedParabankLoginResponse,
} from '../../utilities/utilities';

/**
 * Serial: each test provisions a fresh user via `register.htm`. Running these in parallel against
 * the shared ParaBank host often yields flaky signups (login 400) even when POST returns 200.
 */
test.describe.serial('ParaBank API', () => {
  test.describe('customer ID', () => {
    test('login response — status, XML shape, and customer id field', async ({ parabankApi, parabankApiUser }) => {
      const { username, password } = parabankApiUser.registration;
      const { firstName, lastName } = parabankApiUser.registration;

      const response = await parabankApi.loginRequest(username, password);

      const body = await ApiAssertions.assertApiResponse(
        response,
        expectedParabankLoginResponse(firstName, lastName),
      );

      const idMatch = /<customer>[\s\S]*?<id>(\d+)<\/id>/.exec(body);
      expect(idMatch?.[1]).toMatch(/^\d+$/);
    });

    test('getCustomer — status, XML structure, and id matches provisioned user', async ({
      parabankApi,
      parabankApiUser,
    }) => {
      const { customerId, registration } = parabankApiUser;

      const response = await parabankApi.getCustomer({ customerId: Number(customerId) });

      await ApiAssertions.assertApiResponse(
        response,
        expectedParabankGetCustomerResponse(customerId, registration.firstName),
      );
    });
  });

  test.describe('existing account', () => {
    test('getAccount — status, XML structure, and ids align with customer accounts list', async ({
      parabankApi,
      parabankApiUser,
    }) => {
      const { customerId, primaryAccountId } = parabankApiUser;

      const { status: listStatus, accounts } = await parabankApi.getCustomerAccountsParsed(Number(customerId));
      expect(listStatus, 'GET /customers/{id}/accounts status').toBe(200);
      expect(accounts.length, 'user should have at least one account').toBeGreaterThan(0);

      const listed = accounts.find((a) => a.id === primaryAccountId);
      expect(listed, 'provisioned primary account should appear in list').toBeDefined();

      const response = await parabankApi.getAccount({ accountId: Number(primaryAccountId) });

      await ApiAssertions.assertApiResponse(
        response,
        expectedParabankGetAccountResponse(primaryAccountId, customerId),
      );
      expect(listed?.customerId).toBe(customerId);
    });
  });

  test.describe('create checking account', () => {
    test('create CHECKING account via curl — GET /accounts/{id} confirms', async ({ parabankApi, parabankApiUser }) => {
      const { customerId, primaryAccountId } = parabankApiUser;

      const { statusCode, body } = parabankApi.createCheckingAccountWithCurl({
        customerId: Number(customerId),
        fromAccountId: Number(primaryAccountId),
      });

      ApiAssertions.assertApiResponseText(
        statusCode,
        body,
        expectedParabankCreateCheckingAccountResponse(customerId),
      );

      const created = ParabankApiClient.parseAccountBlocksFromXml(body);
      expect(created.length).toBe(1);
      const row = created[0];
      expect(row).toBeDefined();
      expect(row?.id).toMatch(/^\d+$/);
      expect(row?.id).not.toBe(primaryAccountId);
      const newAccountId = row!.id;

      const getResp = await parabankApi.getAccount({ accountId: Number(newAccountId) });
      await ApiAssertions.assertApiResponse(
        getResp,
        expectedParabankGetAccountResponse(newAccountId, customerId),
      );
    });
  });
});

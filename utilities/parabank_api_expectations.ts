import type { ApiResponseCriteria } from './api_response_assertions';

/**
 * Expected API rules after `GET /login/{username}/{password}` for a known customer profile.
 */
export function expectedParabankLoginResponse(firstName: string, lastName: string): ApiResponseCriteria {
  return {
    status: 200,
    expectOk: true,
    xmlHasTags: ['customer', 'id', 'firstName'],
    xmlFieldEquals: { firstName },
    xmlFieldMatches: { id: /^\d+$/ },
    bodyContains: [`<lastName>${lastName}</lastName>`],
  };
}

/**
 * Expected API rules after `GET /customers/{customerId}` for a customer with the given first name.
 */
export function expectedParabankGetCustomerResponse(
  customerId: string | number,
  firstName: string,
): ApiResponseCriteria {
  return {
    status: 200,
    expectOk: true,
    xmlHasTags: ['customer', 'id', 'firstName', 'lastName'],
    xmlFieldEquals: {
      id: String(customerId),
      firstName,
    },
  };
}

/**
 * Expected API rules after `GET /accounts/{accountId}` for an account owned by `customerId`.
 */
export function expectedParabankGetAccountResponse(
  accountId: string | number,
  customerId: string | number,
): ApiResponseCriteria {
  return {
    status: 200,
    expectOk: true,
    xmlHasTags: ['account', 'id', 'customerId', 'type', 'balance'],
    xmlFieldEquals: {
      id: String(accountId),
      customerId: String(customerId),
    },
    xmlFieldMatches: {
      balance: /^-?\d+\.\d{2}$/,
    },
  };
}

/**
 * Expected API rules after `POST /createAccount` with CHECKING (`newAccountType=0`), same contract as curl.
 */
export function expectedParabankCreateCheckingAccountResponse(customerId: string | number): ApiResponseCriteria {
  return {
    status: 200,
    expectOk: true,
    xmlHasTags: ['account', 'id', 'customerId', 'type', 'balance'],
    xmlFieldEquals: {
      customerId: String(customerId),
      type: 'CHECKING',
    },
    xmlFieldMatches: {
      id: /^\d+$/,
      balance: /^-?\d+(\.\d{1,2})?$/,
    },
  };
}

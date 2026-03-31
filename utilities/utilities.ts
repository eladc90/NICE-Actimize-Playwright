import { randomInt } from 'node:crypto';
import type { ParabankRegistrationData } from '../pages_ui/register_page';

export { ApiAssertions, type ApiResponseCriteria, type UiCriteria } from './api_response_assertions';
export type { ParabankCurlResult } from '../api_request/parabank_api_client';
export {
  expectedParabankLoginResponse,
  expectedParabankGetCustomerResponse,
  expectedParabankGetAccountResponse,
  expectedParabankCreateCheckingAccountResponse,
} from './parabank_api_expectations';
export { provisionParabankApiUser, type ParabankProvisionedApiUser } from './parabank_test_user';

export class Utilities {
  /** One-off registration payload (unique username / SSN / phone pattern) for shared ParaBank environments. */
  static createUniqRegistrationData(): ParabankRegistrationData {
    const password = `Pw!${Utilities.randomAlphanumeric(14)}`;
    /**
     * Keep short — the demo DB column appears to truncate long values, which can look like “username already exists”.
     */
    const username = `t${Date.now()}${Utilities.randomAlphanumeric(4)}`;

    const registrationData: ParabankRegistrationData = {
      firstName: `Test${Utilities.randomAlphanumeric(7)}`,
      lastName: `User${Utilities.randomAlphanumeric(7)}`,
      street: `${randomInt(1, 9999)} Oak ${Utilities.randomAlphanumeric(4)} St`,
      city: `Spring${Utilities.randomAlphanumeric(5)}`,
      state: Utilities.pickState(),
      zipCode: Utilities.randomDigits(5),
      phone: Utilities.randomDigits(10),
      ssn: `${Utilities.randomDigits(3)}-${Utilities.randomDigits(2)}-${Utilities.randomDigits(4)}`,
      username,
      password,
      confirmPassword: password,
    };
    return registrationData;
  }

  // ---------------------------------------------------------------------------
  // Private functions
  // ---------------------------------------------------------------------------

  private static readonly usStateCodes = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA',
    'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK',
    'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
  ] as const;

  private static randomDigits(length: number): string {
    let out = '';
    for (let i = 0; i < length; i++) {
      out += String(randomInt(10));
    }
    return out;
  }

  private static randomAlphanumeric(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let out = '';
    for (let i = 0; i < length; i++) {
      out += chars[randomInt(chars.length)] ?? 'a';
    }
    return out;
  }

  private static pickState(): string {
    const i = randomInt(Utilities.usStateCodes.length);
    return Utilities.usStateCodes[i] ?? 'CA';
  }
}

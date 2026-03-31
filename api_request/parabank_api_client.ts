import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { PARABANK_API_BASE_URL } from '../const_data/api_base_url';
import { ApiAssertions } from '../utilities/api_response_assertions';
import {
  expectedParabankCreateCheckingAccountResponse,
  expectedParabankGetAccountResponse,
  expectedParabankGetCustomerResponse,
  expectedParabankLoginResponse,
} from '../utilities/parabank_api_expectations';

/** OpenAPI `newAccountType` value for CHECKING (`POST /createAccount` query param). */
export const PARABANK_ACCOUNT_TYPE_CHECKING = 0;

/** Raw result from {@link ParabankApiClient.createCheckingAccountWithCurl}. */
export type ParabankCurlResult = {
  statusCode: number;
  body: string;
};

export class ParabankApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly baseUrl: string = PARABANK_API_BASE_URL,
  ) {}

  loginRequest(username: string, password: string): Promise<APIResponse> {
    return this.request.get(
      this.buildUrl('/login/{username}/{password}', { username, password }),
    );
  }

  async login(username: string, password: string): Promise<ParabankLoginResult> {
    const response = await this.loginRequest(username, password);
    const body = await response.text();
    return {
      status: response.status(),
      ok: response.ok(),
      body,
      customerId: ParabankApiClient.parseCustomerIdFromCustomerXml(body),
    };
  }

  getAccount(pathParams: { accountId: number }): Promise<APIResponse> {
    return this.request.get(this.buildUrl('/accounts/{accountId}', pathParams));
  }

  getCustomer(pathParams: { customerId: number }): Promise<APIResponse> {
    return this.request.get(this.buildUrl('/customers/{customerId}', pathParams));
  }

  getCustomerAccounts(pathParams: { customerId: number }): Promise<APIResponse> {
    return this.request.get(this.buildUrl('/customers/{customerId}/accounts', pathParams));
  }

  getPosition(pathParams: { positionId: number }): Promise<APIResponse> {
    return this.request.get(this.buildUrl('/positions/{positionId}', pathParams));
  }

  getPositionHistory(pathParams: { positionId: number; startDate: string; endDate: string }): Promise<APIResponse> {
    return this.request.get(this.buildUrl('/positions/{positionId}/{startDate}/{endDate}', pathParams));
  }

  getCustomerPositions(pathParams: { customerId: number }): Promise<APIResponse> {
    return this.request.get(this.buildUrl('/customers/{customerId}/positions', pathParams));
  }

  getTransaction(pathParams: { transactionId: number }): Promise<APIResponse> {
    return this.request.get(this.buildUrl('/transactions/{transactionId}', pathParams));
  }

  getAccountTransactions(pathParams: { accountId: number }): Promise<APIResponse> {
    return this.request.get(this.buildUrl('/accounts/{accountId}/transactions', pathParams));
  }

  getAccountTransactionsByAmount(pathParams: { accountId: number; amount: number }): Promise<APIResponse> {
    return this.request.get(this.buildUrl('/accounts/{accountId}/transactions/amount/{amount}', pathParams));
  }

  getAccountTransactionsByMonthAndType(pathParams: {
    accountId: number;
    month: string;
    type: string;
  }): Promise<APIResponse> {
    return this.request.get(
      this.buildUrl('/accounts/{accountId}/transactions/month/{month}/type/{type}', pathParams),
    );
  }

  getAccountTransactionsByDateRange(pathParams: {
    accountId: number;
    fromDate: string;
    toDate: string;
  }): Promise<APIResponse> {
    return this.request.get(
      this.buildUrl('/accounts/{accountId}/transactions/fromDate/{fromDate}/toDate/{toDate}', pathParams),
    );
  }

  getAccountTransactionsOnDate(pathParams: { accountId: number; onDate: string }): Promise<APIResponse> {
    return this.request.get(this.buildUrl('/accounts/{accountId}/transactions/onDate/{onDate}', pathParams));
  }

  billPay(
    query: { accountId: number; amount: number },
    payee: ParabankPayee,
    options?: Omit<Parameters<APIRequestContext['post']>[1], 'params' | 'data'>,
  ): Promise<APIResponse> {
    return this.request.post(this.buildUrl('/billpay', {}, query), { data: payee, ...options });
  }

  createAccount(query: {
    customerId: number;
    newAccountType: number;
    fromAccountId: number;
  }): Promise<APIResponse> {
    return this.request.post(this.buildUrl('/createAccount', {}, query));
  }

  /**
   * POST `/createAccount` with {@link PARABANK_ACCOUNT_TYPE_CHECKING} (same as curl):
   * `curl -X POST "${baseUrl}/createAccount?customerId=<id>&newAccountType=0&fromAccountId=<id>"`
   */
  createCheckingAccount(params: { customerId: number; fromAccountId: number }): Promise<APIResponse> {
    return this.createAccount({
      customerId: params.customerId,
      newAccountType: PARABANK_ACCOUNT_TYPE_CHECKING,
      fromAccountId: params.fromAccountId,
    });
  }

  createCheckingAccountWithCurl(params: { customerId: number; fromAccountId: number }): ParabankCurlResult {
    const base = this.baseUrl.replace(/\/$/, '');
    const qs = new URLSearchParams({
      customerId: String(params.customerId),
      newAccountType: String(PARABANK_ACCOUNT_TYPE_CHECKING),
      fromAccountId: String(params.fromAccountId),
    });
    const url = `${base}/createAccount?${qs.toString()}`;

    const curl = process.platform === 'win32' ? 'curl.exe' : 'curl';
    const dir = mkdtempSync(join(tmpdir(), 'parabank-curl-'));
    const outFile = join(dir, 'body.txt');

    try {
      const args = ['-sS', '-X', 'POST', '-o', outFile, '-w', '%{http_code}', url];
      if (process.platform === 'win32') {
        args.splice(1, 0, '--ssl-no-revoke');
      }
      const statusLine = execFileSync(curl, args, { encoding: 'utf-8' }).trim();
      const statusCode = Number(statusLine);
      const body = readFileSync(outFile, 'utf-8');
      return { statusCode, body };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  /** POST `/deposit` */
  deposit(query: { accountId: number; amount: number }): Promise<APIResponse> {
    return this.request.post(this.buildUrl('/deposit', {}, query));
  }

  /** POST `/transfer` */
  transfer(query: { fromAccountId: number; toAccountId: number; amount: number }): Promise<APIResponse> {
    return this.request.post(this.buildUrl('/transfer', {}, query));
  }

  /** POST `/withdraw` */
  withdraw(query: { accountId: number; amount: number }): Promise<APIResponse> {
    return this.request.post(this.buildUrl('/withdraw', {}, query));
  }

  /** POST `/cleanDB` */
  cleanDB(): Promise<APIResponse> {
    return this.request.post(this.buildUrl('/cleanDB'));
  }

  /** POST `/initializeDB` */
  initializeDB(): Promise<APIResponse> {
    return this.request.post(this.buildUrl('/initializeDB'));
  }

  /** POST `/shutdownJmsListener` */
  shutdownJmsListener(): Promise<APIResponse> {
    return this.request.post(this.buildUrl('/shutdownJmsListener'));
  }

  /** POST `/startupJmsListener` */
  startupJmsListener(): Promise<APIResponse> {
    return this.request.post(this.buildUrl('/startupJmsListener'));
  }

  /** POST `/setParameter/{name}/{value}` */
  setParameter(pathParams: { name: string; value: string }): Promise<APIResponse> {
    return this.request.post(this.buildUrl('/setParameter/{name}/{value}', pathParams));
  }

  /** POST `/requestLoan` */
  requestLoan(query: {
    customerId: number;
    amount: number;
    downPayment: number;
    fromAccountId: number;
  }): Promise<APIResponse> {
    return this.request.post(this.buildUrl('/requestLoan', {}, query));
  }

  updateCustomer(
    pathParams: { customerId: number },
    query: {
      firstName: string;
      lastName: string;
      street: string;
      city: string;
      state: string;
      zipCode: string;
      phoneNumber: string;
      ssn: string;
      username: string;
      password: string;
    },
  ): Promise<APIResponse> {
    return this.request.post(this.buildUrl('/customers/update/{customerId}', pathParams, query));
  }

  buyPosition(
    pathParams: { customerId: number },
    query: {
      accountId: number;
      name: string;
      symbol: string;
      shares: number;
      pricePerShare: number;
    },
  ): Promise<APIResponse> {
    return this.request.post(this.buildUrl('/customers/{customerId}/buyPosition', pathParams, query));
  }

  sellPosition(
    pathParams: { customerId: number },
    query: {
      accountId: number;
      positionId: number;
      shares: number;
      pricePerShare: number;
    },
  ): Promise<APIResponse> {
    return this.request.post(this.buildUrl('/customers/{customerId}/sellPosition', pathParams, query));
  }

  get(path: string, options?: Parameters<APIRequestContext['get']>[1]): Promise<APIResponse> {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return this.request.get(`${this.baseUrl}${normalized}`, options);
  }

  post(path: string, options?: Parameters<APIRequestContext['post']>[1]): Promise<APIResponse> {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return this.request.post(`${this.baseUrl}${normalized}`, options);
  }

  async getCustomerAccountsParsed(customerId: number): Promise<{ status: number; accounts: ParabankAccount[] }> {
    const response = await this.getCustomerAccounts({ customerId });
    const body = await response.text();
    return { status: response.status(), accounts: ParabankApiClient.parseAccountBlocksFromXml(body) };
  }

  async getAccountParsed(accountId: number): Promise<{ status: number; account: ParabankAccount | undefined }> {
    const response = await this.getAccount({ accountId });
    const body = await response.text();
    const accounts = ParabankApiClient.parseAccountBlocksFromXml(body);
    return { status: response.status(), account: accounts[0] };
  }

  static parseAccountBlocksFromXml(xml: string): ParabankAccount[] {
    const accounts: ParabankAccount[] = [];
    const blockPattern = /<account>([\s\S]*?)<\/account>/g;
    let block: RegExpExecArray | null;
    while ((block = blockPattern.exec(xml)) !== null) {
      const inner = block[1] ?? '';
      accounts.push({
        id: ParabankApiClient.textTag(inner, 'id'),
        customerId: ParabankApiClient.textTag(inner, 'customerId'),
        type: ParabankApiClient.textTag(inner, 'type'),
        balance: ParabankApiClient.textTag(inner, 'balance'),
      });
    }
    return accounts;
  }

  // —— Assertions ——

  async assertLoginResponse(response: APIResponse, firstName: string, lastName: string): Promise<void> {
    const body = await ApiAssertions.assertApiResponse(
      response,
      expectedParabankLoginResponse(firstName, lastName),
    );
    const idMatch = /<customer>[\s\S]*?<id>(\d+)<\/id>/.exec(body);
    expect(idMatch?.[1], 'login XML should contain numeric customer id').toMatch(/^\d+$/);
  }

  async assertGetCustomerResponse(
    response: APIResponse,
    customerId: string | number,
    firstName: string,
  ): Promise<void> {
    await ApiAssertions.assertApiResponse(
      response,
      expectedParabankGetCustomerResponse(customerId, firstName),
    );
  }

  async assertListedPrimaryAccountMatchesGetAccount(
    customerId: string | number,
    primaryAccountId: string,
  ): Promise<void> {
    const { status: listStatus, accounts } = await this.getCustomerAccountsParsed(Number(customerId));
    expect(listStatus, 'GET /customers/{id}/accounts status').toBe(200);
    expect(accounts.length, 'user should have at least one account').toBeGreaterThan(0);
    const listed = accounts.find((a) => a.id === primaryAccountId);
    expect(listed, 'provisioned primary account should appear in list').toBeDefined();
    expect(listed?.customerId).toBe(String(customerId));
    const response = await this.getAccount({ accountId: Number(primaryAccountId) });
    await ApiAssertions.assertApiResponse(
      response,
      expectedParabankGetAccountResponse(primaryAccountId, customerId),
    );
  }

  assertCreateCheckingCurlResult(
    curl: ParabankCurlResult,
    customerId: string | number,
    options?: { newAccountMustDifferFrom?: string },
  ): string {
    ApiAssertions.assertApiResponseText(
      curl.statusCode,
      curl.body,
      expectedParabankCreateCheckingAccountResponse(customerId),
    );
    const created = ParabankApiClient.parseAccountBlocksFromXml(curl.body);
    expect(created.length, 'createAccount should return one account block').toBe(1);
    const row = created[0];
    expect(row, 'parsed account').toBeDefined();
    expect(row?.id, 'new account id').toMatch(/^\d+$/);
    if (options?.newAccountMustDifferFrom !== undefined) {
      expect(row?.id).not.toBe(options.newAccountMustDifferFrom);
    }
    return row!.id;
  }

  async assertGetAccountResponseForOwner(accountId: string, customerId: string | number): Promise<void> {
    const response = await this.getAccount({ accountId: Number(accountId) });
    await ApiAssertions.assertApiResponse(
      response,
      expectedParabankGetAccountResponse(accountId, customerId),
    );
  }

  assertAccountParsedBalance(
    parsed: { status: number; account?: ParabankAccount },
    label: string,
  ): number {
    expect(parsed.status, `${label}: GET /accounts status`).toBe(200);
    const bal = Number.parseFloat(parsed.account?.balance ?? '');
    expect(Number.isNaN(bal), `${label}: balance is numeric`).toBe(false);
    return bal;
  }

  assertTransferResponseOk(response: APIResponse): void {
    expect(response.status(), 'POST /transfer').toBe(200);
  }

  assertBalancesDeltaAfterTransfer(
    fromBefore: number,
    toBefore: number,
    fromAfter: number,
    toAfter: number,
    amount: number,
  ): void {
    expect(fromAfter).toBe(fromBefore - amount);
    expect(toAfter).toBe(toBefore + amount);
  }

  // —— Private ——

  private buildUrl(
    template: string,
    pathParams: Record<string, string | number> = {},
    query?: Record<string, string | number | boolean | undefined | null>,
  ): string {
    const path = ParabankApiClient.expandPath(template, pathParams);
    const qs = query ? ParabankApiClient.serializeQuery(query) : '';
    return `${this.baseUrl}${path}${qs}`;
  }

  private static expandPath(template: string, pathParams: Record<string, string | number>): string {
    let result = template;
    for (const [key, value] of Object.entries(pathParams)) {
      const encoded = encodeURIComponent(String(value));
      const token = `{${key}}`;
      if (!result.includes(token)) {
        throw new Error(`Path template "${template}" has no placeholder ${token}`);
      }
      result = result.split(token).join(encoded);
    }
    const leftover = /\{[^}]+\}/.exec(result);
    if (leftover) {
      throw new Error(`Missing path value for placeholder "${leftover[0]}" in "${template}"`);
    }
    return result;
  }

  private static serializeQuery(query: Record<string, string | number | boolean | undefined | null>): string {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
    return parts.length ? `?${parts.join('&')}` : '';
  }

  private static parseCustomerIdFromCustomerXml(xml: string): string | undefined {
    const match = /<customer>[\s\S]*?<id>(\d+)<\/id>/.exec(xml);
    return match?.[1];
  }

  private static textTag(fragment: string, tag: string): string {
    const match = new RegExp(`<${tag}>([^<]*)<\\/${tag}>`).exec(fragment);
    return match?.[1] ?? '';
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** From `components.schemas.Address` (OpenAPI 3.0). */
export interface ParabankAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

/** From `components.schemas.Payee`. */
export interface ParabankPayee {
  name?: string;
  address?: ParabankAddress;
  phoneNumber?: string;
  accountNumber?: number;
}

export interface ParabankLoginResult {
  status: number;
  ok: boolean;
  body: string;
  customerId: string | undefined;
}

/** Parsed `<account>` row from XML list responses. */
export interface ParabankAccount {
  id: string;
  customerId: string;
  type: string;
  balance: string;
}

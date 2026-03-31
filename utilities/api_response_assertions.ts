import { expect, type APIResponse, type Page } from '@playwright/test';

/** Rules for {@link ApiAssertions.assertApiResponse}. Compose any subset. */
export type ApiResponseCriteria = {
  /** Required HTTP status (single value or allowed set). */
  status?: number | readonly number[];
  /**
   * When true (default), `response.ok()` must be true (typically 200–29).
   * Set false if you intentionally expect 4xx/5xx and only assert `status`.
   */
  expectOk?: boolean;
  /** Each substring must appear in the body (data correctness / structure hints). */
  bodyContains?: string[];
  /** None of these substrings may appear. */
  bodyNotContains?: string[];
  /** XML / text: each tag name must appear as an opening tag `<name`. */
  xmlHasTags?: string[];
  /** First `<tag>…</tag>` inner text must equal string (data correctness). */
  xmlFieldEquals?: Record<string, string>;
  /** First `<tag>…</tag>` inner text must match regex. */
  xmlFieldMatches?: Record<string, RegExp>;
  /** Body parses as JSON and shallow-matches (response structure / data). */
  jsonPartial?: Record<string, unknown>;
  /** Extra checks on the full body string. */
  bodyAssertion?: (body: string) => void;
};

export type UiCriteria = {
  /** `expect(page).toHaveURL(pattern)`. */
  url?: string | RegExp;
  /** Visible text on page (substring match via getByText). */
  textVisible?: string | RegExp;
  /** Role-based visibility (same as `page.getByRole`). */
  roleVisible?: { role: Parameters<Page['getByRole']>[0]; options?: Parameters<Page['getByRole']>[1] };
};

/**
 * Shared assertions for API responses (status, structure, payload) and light UI checks.
 * Uses Playwright {@link expect} so failures integrate with HTML report / traces.
 */
export class ApiAssertions {
  /**
   * Assert status code is exactly `expected` or one of `expected`.
   */
  static assertStatus(response: APIResponse, expected: number | readonly number[]): void {
    const actual = response.status();
    const allowed = typeof expected === 'number' ? [expected] : [...expected];
    expect(allowed, `HTTP status was ${actual}`).toContain(actual);
  }

  /**
   * Read the body once, then validate status, `ok()`, and optional content rules.
   * @returns response body string for further custom checks
   */
  static async assertApiResponse(response: APIResponse, criteria: ApiResponseCriteria): Promise<string> {
    const body = await response.text();

    if (criteria.status !== undefined) {
      ApiAssertions.assertStatus(response, criteria.status);
    }

    const wantOk = criteria.expectOk !== false;
    if (wantOk) {
      expect(response.ok(), `expected ok HTTP status, got ${response.status()}; body (truncated): ${body.slice(0, 500)}`).toBe(
        true,
      );
    }

    ApiAssertions.applyApiResponseBodyCriteria(body, criteria);

    return body;
  }

  /**
   * Same rules as {@link assertApiResponse}, but for a raw status + body (e.g. subprocess `curl` output).
   */
  static assertApiResponseText(statusCode: number, body: string, criteria: ApiResponseCriteria): string {
    if (criteria.status !== undefined) {
      const allowed = typeof criteria.status === 'number' ? [criteria.status] : [...criteria.status];
      expect(allowed, `HTTP status was ${statusCode}`).toContain(statusCode);
    }

    const wantOk = criteria.expectOk !== false;
    if (wantOk) {
      expect(
        statusCode >= 200 && statusCode < 300,
        `expected ok HTTP status, got ${statusCode}; body (truncated): ${body.slice(0, 500)}`,
      ).toBe(true);
    }

    ApiAssertions.applyApiResponseBodyCriteria(body, criteria);

    return body;
  }

  private static applyApiResponseBodyCriteria(body: string, criteria: ApiResponseCriteria): void {
    for (const fragment of criteria.bodyContains ?? []) {
      expect(body, `body should contain: ${fragment}`).toContain(fragment);
    }
    for (const fragment of criteria.bodyNotContains ?? []) {
      expect(body, `body should not contain: ${fragment}`).not.toContain(fragment);
    }

    for (const tag of criteria.xmlHasTags ?? []) {
      expect(body, `expected XML tag <${tag}>`).toMatch(new RegExp(`<${escapeRegExp(tag)}[\\s>]`));
    }

    for (const [tag, value] of Object.entries(criteria.xmlFieldEquals ?? {})) {
      const inner = firstXmlInnerText(body, tag);
      expect(inner, `missing or empty <${tag}> in response`).not.toBeUndefined();
      expect(inner, `XML <${tag}> inner text`).toBe(value);
    }

    for (const [tag, pattern] of Object.entries(criteria.xmlFieldMatches ?? {})) {
      const inner = firstXmlInnerText(body, tag);
      expect(inner, `missing <${tag}> for pattern check`).not.toBeUndefined();
      expect(inner, `XML <${tag}> inner text`).toMatch(pattern);
    }

    if (criteria.jsonPartial) {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(body) as Record<string, unknown>;
      } catch (e: unknown) {
        throw new Error(`response body is not valid JSON: ${String(e)}`);
      }
      expect(parsed).toMatchObject(criteria.jsonPartial);
    }

    criteria.bodyAssertion?.(body);
  }

  /** UI consistency: URL, text, or role visibility in one call. */
  static async assertUi(page: Page, criteria: UiCriteria): Promise<void> {
    if (criteria.url !== undefined) {
      await expect(page, 'page URL').toHaveURL(criteria.url);
    }
    if (criteria.textVisible !== undefined) {
      await expect(page.getByText(criteria.textVisible)).toBeVisible();
    }
    if (criteria.roleVisible !== undefined) {
      const { role, options } = criteria.roleVisible;
      await expect(page.getByRole(role, options)).toBeVisible();
    }
  }

  /** Combine API body validation with optional UI checks (e.g. after a flow that hits API + page). */
  static async assertApiAndUi(
    response: APIResponse,
    apiCriteria: ApiResponseCriteria,
    page: Page,
    uiCriteria?: UiCriteria,
  ): Promise<string> {
    const body = await ApiAssertions.assertApiResponse(response, apiCriteria);
    if (uiCriteria) {
      await ApiAssertions.assertUi(page, uiCriteria);
    }
    return body;
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** First simple `<tag>...</tag>` inner text (no nested tags in between). */
function firstXmlInnerText(body: string, tag: string): string | undefined {
  const re = new RegExp(`<${escapeRegExp(tag)}>([^<]*)</${escapeRegExp(tag)}>`);
  const m = re.exec(body);
  return m?.[1];
}

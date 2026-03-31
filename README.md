# NICE-Actimize-Playwright

Playwright + TypeScript tests against the **ParaBank** public demo (UI, REST API, and an end-to-end journey). The suite is structured for learning and extension: page objects, a typed API client, shared fixtures, and utilities for registration and assertions.

---

## Setup

### Prerequisites

- **Node.js** (LTS recommended)
- **npm**

### Install dependencies

```bash
npm install
```

### Install browser binaries

```bash
npx playwright install
```

On Linux CI you may need OS deps (see [Playwright CI](https://playwright.dev/docs/ci)).

### Typecheck (optional)

```bash
npm run typecheck
```

---

## Execution

Run commands from the **repository root**.

### E2E journey

Serial ParaBank flow in `tests/e2e` (register → login → API → curl → UI → transfer → balances → logout):

```bash
npx playwright test tests/e2e
```

By default this follows `playwright.config.ts` **browser projects** (e.g. Chromium, Firefox, WebKit) that include `tests/e2e`.

### Optional flags

| Goal | Example |
|------|---------|
| Headed browser | `npx playwright test tests/e2e --headed` |
| Playwright UI mode | `npx playwright test tests/e2e --ui` |
| Chromium only (often stabler on the shared demo) | `npx playwright test tests/e2e --project=chromium` |
| Fewer workers | `npx playwright test tests/e2e --workers=1` |
| Open HTML report after a run | `npx playwright show-report` |

With **`CI=true`**, Playwright applies stricter `forbidOnly`, **retries**, and **workers** as defined in `playwright.config.ts`.

---

## Repository layout (high level)

| Path | Role |
|------|------|
| `tests/UI_test_stages/` | UI tests (page-object driven) |
| `tests/API_test_stages/` | API tests (Chromium project; may open browser for registration) |
| `tests/e2e/` | Long serial customer journey (UI + API + curl) |
| `pages_ui/` | Page objects: actions, locators, `assert*` helpers |
| `api_request/` | `ParabankApiClient` (paths aligned with ParaBank OpenAPI) |
| `fixtures/` | Extended `test` + shared fixtures (`parabank_fixtures` → `parabank_core_fixtures`) |
| `utilities/` | Registration data, API expectations, assertions, small flows |
| `const_data/` | `PARABANK_BASE_URL`, `PARABANK_API_BASE_URL`, etc. |

---

## Design decisions

1. **Page objects mirror product areas** — Each page class groups **main actions**, **locators**, **assertions** (`assert*`), then **private** helpers. UI tests avoid scattering raw `expect` logic that belongs with the page.

2. **`ParabankApiClient` matches OpenAPI surface** — Methods map to documented routes; **parsed XML helpers**, **`assert*`** methods, then **private** URL/parse utilities. Keeps specs thin and expectations reusable.

3. **Fixtures over ad-hoc setup** — `parabank_fixtures` exports extended `test` with pages, API client, and optional provisioned user flows. API specs use a dedicated **`chromium-api`** project (serial, one worker) because provisioning hits the real Register UI.

4. **Disposable users** — `Utilities.createUniqRegistrationData()` avoids hard-coded demo credentials and reduces “username already exists” collisions when data is unique enough for ParaBank’s constraints.

5. **E2E split into nine ordered tests** — `test.describe.configure({ mode: 'serial' })` preserves shared `let` state across steps **in order** on one worker. Because Playwright issues a **new browser context per test**, later UI steps re-authenticate via `parabankUiSessionAfterRegister` (same flow as post-register login).

6. **`curl` for one path** — `createCheckingAccountWithCurl` exercises the same `POST /createAccount` as manual curl (including Windows `curl.exe` / `--ssl-no-revoke`), complementary to `request`-based calls.

7. **Projects split API vs UI** — `API_test_stages` are excluded from generic browser projects and run under `chromium-api` so registration-heavy API runs don’t parallelize uncontrollably against the shared host.

---

## Tradeoffs

| Choice | Benefit | Cost |
|--------|---------|------|
| TypeScript (vs other languages) | Playwright is **first-class** for JS/TS: docs, codegen, types, and fixtures align with TS projects; page objects and API clients gain compile-time checks | Requires Node + TypeScript tooling (no Python/Java runner ergonomics in-repo) |
| Nine separate E2E tests + serial mode | Clear reporting per step; IDE-friendly structure | **Cannot run step 2–9 alone** without failed/shared state; full journey only makes sense as a chain |
| Multi-browser E2E (Chromium, Firefox, WebKit) | Broader coverage | **3×** load on demo; more intermittent failures |
| UI registration for API users | Exercises true signup path | Slower than pure API seed; depends on UI stability |
| Re-login between E2E UI steps | Works with default per-test isolation | Extra navigation and login time |
| Typed client + XML parsing | Stable assertions on real responses | **Fragile** if ParaBank changes response shape/copy |

---

## Assumptions

- **Reachable hosts**: `https://parabank.parasoft.com` (UI + API as in `const_data/`).
- **System `curl`**: Available on `PATH` (`curl.exe` on Windows) for curl-based account creation tests.
- **Playwright `request` API** can call the REST base URL from the test runner environment (network allowed).
- Success copy after signup includes **`Your account was created successfully.`** (see `RegisterPage.assertSignupSuccess`).
- Not assumed: a private ParaBank instance, SSO, or captcha (demo has none at the time of writing).

---

## How to scale it

1. **Account lifecycle** — Tests **create real registrations** (E2E, API stages that hit Register). At scale you must **remove or reset those users** (private instance: DB reset such as `POST /cleanDB`, admin tooling, or ephemeral environments). The public demo has **no** per-user delete API; do not rely on shared-host cleanup.

2. **Parallelism and sharding** — Use `npx playwright test --shard=1/3` (and CI matrix) to split by project or directory. Keep **registration-heavy** suites on **low worker count** or dedicated jobs.

3. **Tag / grep** — Introduce tags (e.g. `@smoke`, `@e2e`) and run subsets: `npx playwright test --grep @smoke`.

4. **Environment configuration** — Point `PARABANK_BASE_URL` / `PARABANK_API_BASE_URL` (after refactoring constants to read `process.env`) at a **dedicated test deployment** to remove shared-demo noise; add `.env` + `dotenv` as already hinted in `playwright.config.ts`.

5. **Local app + `webServer`** — If you replace the demo with a containerized ParaBank (or proxy), enable `webServer` in config and use `baseURL` for faster, isolated runs.

6. **Storage state** — For large UI suites, perform login once per worker file and reuse `storageState` to cut login time (tradeoff: more fixture complexity).

7. **Separate E2E job** — Run `tests/e2e` nightly or on release branches only; keep PR checks on `UI_test_stages` + selective API tests for speed.

8. **Reporting and artifacts** — Enable traces/screenshots in CI for failures (`trace`, `screenshot`, `video` in config) to triage demo-side issues faster.

---

## Links

- [ParaBank demo](https://parabank.parasoft.com/parabank)
- [ParaBank Swagger UI](https://parabank.parasoft.com/parabank/api-docs/index.html)
- [Playwright documentation](https://playwright.dev/docs/intro)

import { expect, test } from '../../fixtures/parabank_fixtures';

test.describe('ParaBank negative cases', () => {
  /**
   * Unknown username on REST login — web login on this demo often does not reject the same way, so the API is the reliable negative.
   */
  test('Login with unknown user (API) — no customer id', async ({ parabankApi }) => {
    const unknownUser: string = `no_such_customer_${Date.now()}`;
    const result = await parabankApi.login(unknownUser, 'SomeBadPass!9');
    expect(result.customerId).toBeUndefined();
    if (result.ok) {
      expect(result.body.length).toBeGreaterThan(0);
      expect(result.body.toLowerCase()).toMatch(/error|invalid|fail|denied|not.*verified|exception|unknown/);
    } else {
      expect(result.status).toBeGreaterThanOrEqual(400);
    }
  });

  /**
   * Empty password on web login — stay on login surface (complements API unknown-user negative).
   */
  test('Login with empty password (UI) — validation / rejected', async ({ homePage }) => {
    await homePage.openHome();
    await homePage.assertHomeOrLogin();
    await expect(homePage.usernameInput()).toBeVisible();
    await homePage.usernameInput().fill('negative_empty_password_probe');
    await homePage.passwordInput().fill('');
    await homePage.loginButton().click();
    await homePage.assertEmptyPasswordRejectedByFormValidation();
  });

  /**
   * `GET /accounts/{accountId}` with an id that does not exist (or is implausibly large for this demo).
   */
  test('GET account — unknown account id (API)', async ({ parabankApi }) => {
    const nonExistentAccountId = 9_999_999_999;
    const response = await parabankApi.getAccount({ accountId: nonExistentAccountId });
    expect(response.ok(), 'GET /accounts/{id} must fail for a non-existent account').toBe(false);
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

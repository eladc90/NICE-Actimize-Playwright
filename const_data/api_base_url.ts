/**
 * ParaBank REST API — paths match OpenAPI `servers[0].url`.
 *
 * @see Swagger UI https://parabank.parasoft.com/parabank/api-docs/index.html
 * @see OpenAPI document https://parabank.parasoft.com/parabank/services/bank/openapi.yaml
 */
export const PARABANK_SWAGGER_UI_URL = 'https://parabank.parasoft.com/parabank/api-docs/index.html' as const;

export const PARABANK_OPENAPI_YAML_URL = 'https://parabank.parasoft.com/parabank/services/bank/openapi.yaml' as const;

/** Resolved base (demo host + server path from the spec). */
export const PARABANK_API_BASE_URL = 'https://parabank.parasoft.com/parabank/services/bank' as const;

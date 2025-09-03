import { type KoriRequest } from '../../context/index.js';
import { KoriValidationConfigError } from '../../error/index.js';
import {
  getKoriRequestSchemaProvider,
  isKoriRequestSchema,
  type KoriRequestSchemaDefault,
} from '../../request-schema/index.js';
import {
  getKoriRequestValidatorProvider,
  isKoriRequestValidator,
  type KoriRequestValidatorDefault,
} from '../../request-validator/index.js';
import { type RequestValidationErrorDefault, type RequestValidationSuccess } from '../../routing/index.js';
import { ok, err, type KoriResult } from '../../util/index.js';

import { validateRequestBody } from './validate-body.js';
import { validateRequestHeaders } from './validate-headers.js';
import { validateRequestParams } from './validate-params.js';
import { validateRequestQueries } from './validate-queries.js';

/**
 * Resolves a request validation function from validator and schema.
 *
 * Validates all request components (params, queries, headers, body) in parallel
 * and returns aggregated results or errors.
 *
 * @param options - Configuration for validation function
 * @param options.requestValidator - The request validator to use
 * @param options.requestSchema - The request schema to validate against
 * @returns Validation function or undefined if validator/schema not provided
 * @throws {KoriValidationConfigError} When validator and schema providers don't match
 */
export function resolveInternalRequestValidator({
  requestValidator,
  requestSchema,
}: {
  requestValidator?: KoriRequestValidatorDefault;
  requestSchema?: KoriRequestSchemaDefault;
}): ((req: KoriRequest) => Promise<KoriResult<RequestValidationSuccess, RequestValidationErrorDefault>>) | undefined {
  if (!requestValidator || !requestSchema) {
    return undefined;
  }

  if (!isKoriRequestValidator(requestValidator)) {
    throw new KoriValidationConfigError('Invalid request validator: missing provider information');
  }

  if (!isKoriRequestSchema(requestSchema)) {
    throw new KoriValidationConfigError('Invalid request schema: missing provider information');
  }

  const validatorProvider = getKoriRequestValidatorProvider(requestValidator);
  const schemaProvider = getKoriRequestSchemaProvider(requestSchema);

  if (validatorProvider !== schemaProvider) {
    throw new KoriValidationConfigError(
      `Request validator and schema provider mismatch: validator uses ${String(validatorProvider)}, schema uses ${String(schemaProvider)}`,
    );
  }

  return async (req) => {
    const { body: bodySchema, params: paramsSchema, queries: queriesSchema, headers: headersSchema } = requestSchema;

    const [paramsResult, queriesResult, headersResult, bodyResult] = await Promise.all([
      validateRequestParams({ validator: requestValidator, schema: paramsSchema, req }),
      validateRequestQueries({ validator: requestValidator, schema: queriesSchema, req }),
      validateRequestHeaders({ validator: requestValidator, schema: headersSchema, req }),
      validateRequestBody({ validator: requestValidator, schema: bodySchema, req }),
    ]);

    if (paramsResult.ok && queriesResult.ok && headersResult.ok && bodyResult.ok) {
      return ok({
        params: paramsResult.value,
        queries: queriesResult.value,
        headers: headersResult.value,
        body: bodyResult.value,
      });
    }

    const errors: RequestValidationErrorDefault = {};
    if (!paramsResult.ok) {
      errors.params = paramsResult.error;
    }
    if (!queriesResult.ok) {
      errors.queries = queriesResult.error;
    }
    if (!headersResult.ok) {
      errors.headers = headersResult.error;
    }
    if (!bodyResult.ok) {
      errors.body = bodyResult.error;
    }
    return err(errors);
  };
}

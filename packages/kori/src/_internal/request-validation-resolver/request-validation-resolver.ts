import { type KoriRequest } from '../../context/index.js';
import { KoriValidationConfigError } from '../../error/index.js';
import { type KoriRequestSchemaBase } from '../../request-schema/index.js';
import { type RequestValidationFailureBase, type RequestValidationSuccess } from '../../routing/index.js';
import { fail, succeed, type KoriResult } from '../../util/index.js';
import { type KoriValidatorBase } from '../../validator/index.js';

import { validateRequestBody } from './validate-request-body.js';
import { validateRequestField } from './validate-request-field.js';

/**
 * Resolves and creates a validation function for a given request schema and validator.
 *
 * This function checks for configuration errors, such as a mismatch between the
 * schema provider and the validator provider. If the configuration is valid, it
 * returns a new function that performs validation for all parts of a request
 * (params, queries, headers, and body) in parallel.
 *
 * If no schema or validator is provided, it returns `undefined`, indicating
 * that no validation is necessary for the route.
 *
 * @param options.validator - The request validator.
 * @param options.schema - The request schema.
 * @returns A validation function if configured, otherwise `undefined`.
 * @throws {KoriValidationConfigError} If the validator and schema providers do not match.
 */
export function resolveRequestValidator({
  validator,
  schema,
}: {
  validator?: KoriValidatorBase;
  schema?: KoriRequestSchemaBase;
}): ((req: KoriRequest) => Promise<KoriResult<RequestValidationSuccess, RequestValidationFailureBase>>) | undefined {
  if (!validator || !schema) {
    return undefined;
  }

  const validatorProvider = validator.provider;
  const schemaProvider = schema.provider;
  if (validatorProvider !== schemaProvider) {
    throw new KoriValidationConfigError(
      `Provider mismatch: validator uses "${validatorProvider}" but schema uses "${schemaProvider}"`,
    );
  }

  return async (req) => {
    const { body: bodySchema, params: paramsSchema, queries: queriesSchema, headers: headersSchema } = schema;

    const [paramsResult, queriesResult, headersResult, bodyResult] = await Promise.all([
      validateRequestField({ validator, schema: paramsSchema, value: req.params() }),
      validateRequestField({ validator, schema: queriesSchema, value: req.queries() }),
      validateRequestField({ validator, schema: headersSchema, value: req.headers() }),
      validateRequestBody({ validator, schema: bodySchema, req }),
    ]);

    if (paramsResult.success && queriesResult.success && headersResult.success && bodyResult.success) {
      return succeed({
        params: paramsResult.value,
        queries: queriesResult.value,
        headers: headersResult.value,
        body: bodyResult.value,
      });
    }

    const reasons: RequestValidationFailureBase = {};
    if (!paramsResult.success) {
      reasons.params = paramsResult.reason;
    }
    if (!queriesResult.success) {
      reasons.queries = queriesResult.reason;
    }
    if (!headersResult.success) {
      reasons.headers = headersResult.reason;
    }
    if (!bodyResult.success) {
      reasons.body = bodyResult.reason;
    }
    return fail(reasons);
  };
}

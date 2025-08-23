import { type KoriRequest } from '../context/index.js';
import { type KoriRequestSchemaDefault } from '../schema-request/index.js';
import { ok, err, type KoriResult } from '../util/index.js';

import { type KoriRequestValidationError } from './error.js';
import { validateRequestBody } from './validate-body.js';
import { validateRequestHeaders } from './validate-headers.js';
import { validateRequestParams } from './validate-params.js';
import { validateRequestQueries } from './validate-queries.js';
import { type KoriRequestValidatorDefault } from './validator.js';

export type KoriRequestValidationSuccess = {
  params: unknown;
  queries: unknown;
  headers: unknown;
  body: unknown;
};

export function resolveRequestValidationFunction({
  requestValidator,
  requestSchema,
}: {
  requestValidator?: KoriRequestValidatorDefault;
  requestSchema?: KoriRequestSchemaDefault;
}): ((req: KoriRequest) => Promise<KoriResult<KoriRequestValidationSuccess, KoriRequestValidationError>>) | undefined {
  // TODO: How to handle invalid providers?
  if (!requestValidator || !requestSchema) {
    return undefined;
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

    const errors: KoriRequestValidationError<unknown> = {};
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

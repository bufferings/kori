import { type KoriRequest } from '../context/index.js';
import { type KoriRequestSchemaDefault } from '../schema-request/index.js';
import { ok, err, type KoriResult } from '../util/index.js';

import { type KoriFieldValidationError } from './error.js';
import { type KoriRequestValidatorDefault } from './validator.js';

export async function validateRequestQueries({
  validator,
  schema,
  req,
}: {
  validator: KoriRequestValidatorDefault;
  schema: KoriRequestSchemaDefault['queries'];
  req: KoriRequest;
}): Promise<KoriResult<unknown, KoriFieldValidationError<unknown>>> {
  if (!schema) {
    return ok(undefined);
  }

  const result = await validator.validateQueries({ schema, queries: req.queryParams() });
  if (result.ok) {
    return result;
  }

  return err({
    stage: 'validation',
    error: result.error,
  });
}

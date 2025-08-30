import { type KoriRequest } from '../../context/index.js';
import { type KoriRequestSchemaDefault } from '../../request-schema/index.js';
import { type KoriRequestValidatorDefault } from '../../request-validator/index.js';
import { ok, err, type KoriResult } from '../../util/index.js';

import { type FieldValidationErrorDefault } from './validation-result.js';

/** @internal */
export async function validateRequestQueries({
  validator,
  schema,
  req,
}: {
  validator: KoriRequestValidatorDefault;
  schema: KoriRequestSchemaDefault['queries'];
  req: KoriRequest;
}): Promise<KoriResult<unknown, FieldValidationErrorDefault>> {
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

import { type KoriRequest } from '../../context/index.js';
import { type KoriRequestSchemaDefault } from '../../request-schema/index.js';
import { type KoriRequestValidatorDefault } from '../../request-validator/index.js';
import { type RequestFieldValidationFailureDefault } from '../../routing/index.js';
import { succeed, fail, type KoriResult } from '../../util/index.js';

/** @internal */
export async function validateRequestHeaders({
  validator,
  schema,
  req,
}: {
  validator: KoriRequestValidatorDefault;
  schema: KoriRequestSchemaDefault['headers'];
  req: KoriRequest;
}): Promise<KoriResult<unknown, RequestFieldValidationFailureDefault>> {
  if (!schema) {
    return succeed(undefined);
  }

  const result = await validator.validateHeaders({ schema, headers: req.headers() });
  if (result.success) {
    return result;
  }

  return fail({
    stage: 'validation',
    reason: result.reason,
  });
}

import { type RequestFieldValidationFailureBase } from '../../routing/index.js';
import { type KoriSchemaBase } from '../../schema/index.js';
import { fail, succeed, type KoriResult } from '../../util/index.js';
import { type KoriValidatorBase } from '../../validator/index.js';

/**
 * Validates the path parameters, query strings, or headers of a request
 * against a schema using the provided validator.
 *
 * @param options.validator - The request validator.
 * @param options.schema - The request field schema.
 * @param options.value - The raw value to validate.
 * @returns A KoriResult indicating success or failure.
 *
 * @internal
 */
export async function validateRequestField({
  validator,
  schema,
  value,
}: {
  validator: KoriValidatorBase;
  schema: KoriSchemaBase | undefined;
  value: unknown;
}): Promise<KoriResult<unknown, RequestFieldValidationFailureBase>> {
  if (!schema) {
    return succeed(undefined);
  }

  const result = await validator.validate({ schema, value });
  if (result.success) {
    return result;
  }

  return fail({
    stage: 'validation',
    reason: result.reason,
  });
}

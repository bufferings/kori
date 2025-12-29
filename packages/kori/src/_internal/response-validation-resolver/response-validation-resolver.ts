import { type KoriResponse } from '../../context/index.js';
import { KoriError, KoriErrorCode } from '../../error/index.js';
import { type KoriResponseSchemaBase, type KoriResponseSchemaContentEntryBase } from '../../response-schema/index.js';
import { type ResponseValidationFailureBase, type ResponseValidationSuccess } from '../../routing/index.js';
import { type KoriSchemaBase } from '../../schema/index.js';
import { succeed, fail, type KoriResult } from '../../util/index.js';
import { type KoriValidatorBase } from '../../validator/index.js';

import { validateResponseBody } from './validate-response-body.js';

/**
 * Finds the most specific response schema for a status code, supporting exact
 * codes (e.g., 200), range wildcards (e.g., 2XX), and a "default" fallback.
 *
 * @param options.schemaResponses - The responses definition from the schema.
 * @param options.statusCode - The status code to resolve.
 * @returns The resolved schema entry, or `undefined` if no match is found.
 */
function resolveSchemaEntryByStatusCode({
  schemaResponses,
  statusCode,
}: {
  schemaResponses: NonNullable<KoriResponseSchemaBase['responses']>;
  statusCode: number;
}): KoriSchemaBase | KoriResponseSchemaContentEntryBase | undefined {
  const statusCodeStr = statusCode.toString();

  if (statusCodeStr in schemaResponses) {
    return schemaResponses[statusCodeStr as keyof typeof schemaResponses];
  }

  const wildcardPattern = `${statusCodeStr[0]}XX`;
  if (wildcardPattern in schemaResponses) {
    return schemaResponses[wildcardPattern as keyof typeof schemaResponses];
  }

  if ('default' in schemaResponses) {
    return schemaResponses.default;
  }

  return undefined;
}

/**
 * Resolves a response validation function from validator and schema.
 *
 * Resolves appropriate schema by status code, then validates response body
 * and returns aggregated results or failures. Returns undefined if no validation
 * is needed (missing validator, schema, or response definitions).
 *
 * @param options.validator - The response validator.
 * @param options.schema - The response schema.
 * @returns Validation function or undefined if validator/schema/responses not provided
 * @throws {KoriError} When validator and schema providers don't match (code: VALIDATION_CONFIG_ERROR)
 */
export function resolveResponseValidator({
  validator,
  schema,
}: {
  validator?: KoriValidatorBase;
  schema?: KoriResponseSchemaBase;
}): ((res: KoriResponse) => Promise<KoriResult<ResponseValidationSuccess, ResponseValidationFailureBase>>) | undefined {
  if (!validator || !schema) {
    return undefined;
  }

  const validatorProvider = validator.provider;
  const schemaProvider = schema.provider;
  if (validatorProvider !== schemaProvider) {
    throw new KoriError(
      `Provider mismatch: validator uses "${validatorProvider}" but schema uses "${schemaProvider}"`,
      { code: KoriErrorCode.VALIDATION_CONFIG_ERROR },
    );
  }

  const schemaResponses = schema.responses;
  if (!schemaResponses) {
    return undefined;
  }

  return async (res) => {
    const statusCode = res.getStatus();
    const schemaEntry = resolveSchemaEntryByStatusCode({ schemaResponses, statusCode });
    if (!schemaEntry) {
      return fail({
        statusCode: {
          type: 'NO_SCHEMA_FOR_STATUS_CODE',
          message: 'No response schema found for status code',
          statusCode,
        },
      });
    }

    const bodyResult = await validateResponseBody({ validator, schemaEntry, res });

    if (bodyResult.success) {
      return succeed({ body: bodyResult.value });
    }

    return fail({
      body: bodyResult.reason,
    });
  };
}

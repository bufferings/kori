import { type KoriResponse } from '../../context/index.js';
import { KoriValidationConfigError } from '../../error/index.js';
import {
  getKoriResponseSchemaProvider,
  isKoriResponseSchema,
  type KoriResponseSchemaContentEntryDefault,
  type KoriResponseSchemaDefault,
  type KoriResponseSchemaSimpleEntryDefault,
} from '../../response-schema/index.js';
import {
  getKoriResponseValidatorProvider,
  isKoriResponseValidator,
  type KoriResponseValidatorDefault,
} from '../../response-validator/index.js';
import { type ResponseValidationErrorDefault, type ResponseValidationSuccess } from '../../routing/index.js';
import { ok, err, type KoriResult } from '../../util/index.js';

import { validateResponseBody } from './validate-body.js';

/**
 * Resolves schema entry for a given status code.
 *
 * Uses priority order: exact match, wildcard (2XX), then default.
 *
 * @param options - Configuration for schema resolution
 * @param options.responseSchema - The response schema to resolve from
 * @param options.statusCode - HTTP status code to match
 * @returns Matching schema entry or undefined if no match found
 */
function resolveSchemaEntryByStatusCode({
  responseSchema,
  statusCode,
}: {
  responseSchema: KoriResponseSchemaDefault;
  statusCode: number;
}): KoriResponseSchemaSimpleEntryDefault | KoriResponseSchemaContentEntryDefault | undefined {
  const statusCodeStr = statusCode.toString();

  const responses = responseSchema.responses;

  if (statusCodeStr in responses) {
    return responses[statusCodeStr as keyof typeof responses];
  }

  const wildcardPattern = `${statusCodeStr[0]}XX`;
  if (wildcardPattern in responses) {
    return responses[wildcardPattern as keyof typeof responses];
  }

  if ('default' in responses) {
    return responses.default;
  }

  return undefined;
}

/**
 * Resolves a response validation function from validator and schema.
 *
 * Resolves appropriate schema by status code, then validates response body
 * and returns aggregated results or errors.
 *
 * @param options - Configuration for validation function
 * @param options.responseValidator - The response validator to use
 * @param options.responseSchema - The response schema to validate against
 * @returns Validation function or undefined if validator/schema not provided
 * @throws {KoriValidationConfigError} When validator and schema providers don't match
 */
export function resolveInternalResponseValidator({
  responseValidator,
  responseSchema,
}: {
  responseValidator?: KoriResponseValidatorDefault;
  responseSchema?: KoriResponseSchemaDefault;
}):
  | ((res: KoriResponse) => Promise<KoriResult<ResponseValidationSuccess, ResponseValidationErrorDefault>>)
  | undefined {
  if (!responseValidator || !responseSchema) {
    return undefined;
  }

  if (!isKoriResponseValidator(responseValidator)) {
    throw new KoriValidationConfigError('Invalid response validator: missing provider information');
  }

  if (!isKoriResponseSchema(responseSchema)) {
    throw new KoriValidationConfigError('Invalid response schema: missing provider information');
  }

  const validatorProvider = getKoriResponseValidatorProvider(responseValidator);
  const schemaProvider = getKoriResponseSchemaProvider(responseSchema);

  if (validatorProvider !== schemaProvider) {
    throw new KoriValidationConfigError(
      `Response validator and schema provider mismatch: validator uses ${String(validatorProvider)}, schema uses ${String(schemaProvider)}`,
    );
  }

  return async (res) => {
    const schemaEntry = resolveSchemaEntryByStatusCode({ responseSchema, statusCode: res.getStatus() });
    if (!schemaEntry) {
      return err({
        statusCode: {
          type: 'NO_SCHEMA_FOR_STATUS_CODE',
          message: 'No response schema found for status code',
          statusCode: res.getStatus(),
        },
      });
    }

    const bodyResult = await validateResponseBody({ validator: responseValidator, schemaEntry, res });

    if (bodyResult.ok) {
      return ok({ body: bodyResult.value });
    }

    return err({
      body: bodyResult.error,
    });
  };
}

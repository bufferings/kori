import { type KoriResponse } from '../context/index.js';
import { getKoriResponseSchemaProvider, type KoriResponseSchemaDefault } from '../schema-response/index.js';
import { ok, err, type KoriResult } from '../util/index.js';

import { type KoriResponseValidationError } from './error.js';
import { validateResponseBody } from './validate-body.js';
import { getKoriResponseValidatorProvider, type KoriResponseValidatorDefault } from './validator.js';

export type KoriResponseValidationSuccess = {
  body: unknown;
};

export function resolveResponseValidationFunction({
  responseValidator,
  responseSchema,
}: {
  responseValidator?: KoriResponseValidatorDefault;
  responseSchema?: KoriResponseSchemaDefault;
}):
  | ((res: KoriResponse) => Promise<KoriResult<KoriResponseValidationSuccess, KoriResponseValidationError>>)
  | undefined {
  if (!responseValidator || !responseSchema) {
    return undefined;
  }

  // Provider compatibility check
  if (getKoriResponseValidatorProvider(responseValidator) !== getKoriResponseSchemaProvider(responseSchema)) {
    return undefined;
  }

  return async (res) => {
    // TODO: has status code and no body schema, no matching status code, etc...
    const bodyResult = await validateResponseBody({ responseValidator, responseSchema, res });

    if (bodyResult.ok) {
      return ok({ body: bodyResult.value });
    }

    return err({
      body: bodyResult.error,
    });
  };
}

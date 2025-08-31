import { describe, test, expectTypeOf } from 'vitest';

import { createKoriResponseValidator } from '../../src/response-validator/index.js';
import { ok } from '../../src/util/index.js';

import { type InferResponseValidationError } from '../../src/routing/response-validation-error-handler.js';

const TestProvider = Symbol('test-provider');

describe('InferResponseValidationError', () => {
  test('extracts error type from response validator', () => {
    const _validator = createKoriResponseValidator({
      provider: TestProvider,
      validateBody: () => ok({}),
    });

    expectTypeOf<InferResponseValidationError<typeof _validator>>().toEqualTypeOf<{
      statusCode?: { type: 'NO_SCHEMA_FOR_STATUS_CODE'; message: string; statusCode: number };
      body?:
        | { stage: 'validation'; error: unknown }
        | {
            stage: 'pre-validation';
            type: 'UNSUPPORTED_MEDIA_TYPE';
            message: string;
            supportedTypes: string[];
            responseType: string;
          };
    }>();
  });

  test('returns never for non-validator types', () => {
    expectTypeOf<InferResponseValidationError<string>>().toEqualTypeOf<never>();
    expectTypeOf<InferResponseValidationError<undefined>>().toEqualTypeOf<never>();
    expectTypeOf<InferResponseValidationError<null>>().toEqualTypeOf<never>();
  });

  test('preserves validator error type parameter', () => {
    type CustomError = { code: string; details: unknown };

    const _validatorWithCustomError = createKoriResponseValidator<typeof TestProvider, any, CustomError>({
      provider: TestProvider,
      validateBody: () => ok({}),
    });

    expectTypeOf<InferResponseValidationError<typeof _validatorWithCustomError>>().toEqualTypeOf<{
      statusCode?: { type: 'NO_SCHEMA_FOR_STATUS_CODE'; message: string; statusCode: number };
      body?:
        | { stage: 'validation'; error: CustomError }
        | {
            stage: 'pre-validation';
            type: 'UNSUPPORTED_MEDIA_TYPE';
            message: string;
            supportedTypes: string[];
            responseType: string;
          };
    }>();
  });
});

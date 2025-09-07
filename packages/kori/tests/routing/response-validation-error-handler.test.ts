import { describe, test, expectTypeOf } from 'vitest';

import { createKoriResponseValidator } from '../../src/response-validator/index.js';
import { succeed } from '../../src/util/index.js';

import { type InferResponseValidationFailureReason } from '../../src/routing/response-validation-failure-handler.js';

const TestProvider = Symbol('test-provider');

describe('InferResponseValidationFailureReason', () => {
  test('extracts failure reason type from response validator', () => {
    const _validator = createKoriResponseValidator({
      provider: TestProvider,
      validateBody: () => succeed({}),
    });

    expectTypeOf<InferResponseValidationFailureReason<typeof _validator>>().toEqualTypeOf<{
      statusCode?: { type: 'NO_SCHEMA_FOR_STATUS_CODE'; message: string; statusCode: number };
      body?:
        | { stage: 'validation'; reason: unknown }
        | {
            stage: 'pre-validation';
            type: 'UNSUPPORTED_MEDIA_TYPE';
            message: string;
            supportedMediaTypes: string[];
            responseMediaType: string;
          };
    }>();
  });

  test('returns never for non-validator types', () => {
    expectTypeOf<InferResponseValidationFailureReason<string>>().toEqualTypeOf<never>();
    expectTypeOf<InferResponseValidationFailureReason<undefined>>().toEqualTypeOf<never>();
    expectTypeOf<InferResponseValidationFailureReason<null>>().toEqualTypeOf<never>();
  });

  test('preserves validator failure reason type parameter', () => {
    type CustomFailureReason = { code: string; details: unknown };

    const _validatorWithCustomFailureReason = createKoriResponseValidator<
      typeof TestProvider,
      any,
      CustomFailureReason
    >({
      provider: TestProvider,
      validateBody: () => succeed({}),
    });

    expectTypeOf<InferResponseValidationFailureReason<typeof _validatorWithCustomFailureReason>>().toEqualTypeOf<{
      statusCode?: { type: 'NO_SCHEMA_FOR_STATUS_CODE'; message: string; statusCode: number };
      body?:
        | {
            stage: 'pre-validation';
            type: 'UNSUPPORTED_MEDIA_TYPE';
            message: string;
            supportedMediaTypes: string[];
            responseMediaType: string;
          }
        | { stage: 'validation'; reason: CustomFailureReason };
    }>();
  });
});

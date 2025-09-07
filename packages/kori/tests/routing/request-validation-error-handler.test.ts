import { describe, test, expectTypeOf } from 'vitest';

import { createKoriRequestValidator } from '../../src/request-validator/index.js';
import { succeed } from '../../src/util/index.js';

import { type InferRequestValidationFailureReason } from '../../src/routing/request-validation-failure-handler.js';

const TestProvider = Symbol('test-provider');

describe('InferRequestValidationFailureReason', () => {
  test('extracts failure reason type from request validator', () => {
    const _validator = createKoriRequestValidator({
      provider: TestProvider,
      validateParams: () => succeed({}),
      validateQueries: () => succeed({}),
      validateHeaders: () => succeed({}),
      validateBody: () => succeed({}),
    });

    expectTypeOf<InferRequestValidationFailureReason<typeof _validator>>().toEqualTypeOf<{
      params?: { stage: 'validation'; reason: unknown };
      queries?: { stage: 'validation'; reason: unknown };
      headers?: { stage: 'validation'; reason: unknown };
      body?:
        | {
            stage: 'pre-validation';
            type: 'UNSUPPORTED_MEDIA_TYPE';
            message: string;
            supportedMediaTypes: string[];
            requestMediaType: string;
          }
        | { stage: 'pre-validation'; type: 'INVALID_BODY'; message: string; cause?: unknown }
        | { stage: 'validation'; reason: unknown };
    }>();
  });

  test('returns never for non-validator types', () => {
    expectTypeOf<InferRequestValidationFailureReason<string>>().toEqualTypeOf<never>();
    expectTypeOf<InferRequestValidationFailureReason<undefined>>().toEqualTypeOf<never>();
    expectTypeOf<InferRequestValidationFailureReason<null>>().toEqualTypeOf<never>();
  });

  test('preserves validator failure reason type parameter', () => {
    type CustomFailureReason = { code: string; details: unknown };

    const _validatorWithCustomFailureReason = createKoriRequestValidator<typeof TestProvider, any, CustomFailureReason>(
      {
        provider: TestProvider,
        validateParams: () => succeed({}),
        validateQueries: () => succeed({}),
        validateHeaders: () => succeed({}),
        validateBody: () => succeed({}),
      },
    );

    expectTypeOf<InferRequestValidationFailureReason<typeof _validatorWithCustomFailureReason>>().toEqualTypeOf<{
      params?: { stage: 'validation'; reason: CustomFailureReason };
      queries?: { stage: 'validation'; reason: CustomFailureReason };
      headers?: { stage: 'validation'; reason: CustomFailureReason };
      body?:
        | {
            stage: 'pre-validation';
            type: 'UNSUPPORTED_MEDIA_TYPE';
            message: string;
            supportedMediaTypes: string[];
            requestMediaType: string;
          }
        | { stage: 'pre-validation'; type: 'INVALID_BODY'; message: string; cause?: unknown }
        | { stage: 'validation'; reason: CustomFailureReason };
    }>();
  });
});

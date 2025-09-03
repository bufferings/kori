import { describe, test, expectTypeOf } from 'vitest';

import { createKoriRequestValidator } from '../../src/request-validator/index.js';
import { ok } from '../../src/util/index.js';

import { type InferRequestValidationError } from '../../src/routing/request-validation-error-handler.js';

const TestProvider = Symbol('test-provider');

describe('InferRequestValidationError', () => {
  test('extracts error type from request validator', () => {
    const _validator = createKoriRequestValidator({
      provider: TestProvider,
      validateParams: () => ok({}),
      validateQueries: () => ok({}),
      validateHeaders: () => ok({}),
      validateBody: () => ok({}),
    });

    expectTypeOf<InferRequestValidationError<typeof _validator>>().toEqualTypeOf<{
      params?: { stage: 'validation'; error: unknown };
      queries?: { stage: 'validation'; error: unknown };
      headers?: { stage: 'validation'; error: unknown };
      body?:
        | { stage: 'validation'; error: unknown }
        | {
            stage: 'pre-validation';
            type: 'UNSUPPORTED_MEDIA_TYPE';
            message: string;
            supportedTypes: string[];
            requestedType: string;
          }
        | { stage: 'pre-validation'; type: 'INVALID_BODY'; message: string; cause?: unknown };
    }>();
  });

  test('returns never for non-validator types', () => {
    expectTypeOf<InferRequestValidationError<string>>().toEqualTypeOf<never>();
    expectTypeOf<InferRequestValidationError<undefined>>().toEqualTypeOf<never>();
    expectTypeOf<InferRequestValidationError<null>>().toEqualTypeOf<never>();
  });

  test('preserves validator error type parameter', () => {
    type CustomError = { code: string; details: unknown };

    const _validatorWithCustomError = createKoriRequestValidator<typeof TestProvider, any, CustomError>({
      provider: TestProvider,
      validateParams: () => ok({}),
      validateQueries: () => ok({}),
      validateHeaders: () => ok({}),
      validateBody: () => ok({}),
    });

    expectTypeOf<InferRequestValidationError<typeof _validatorWithCustomError>>().toEqualTypeOf<{
      params?: { stage: 'validation'; error: CustomError };
      queries?: { stage: 'validation'; error: CustomError };
      headers?: { stage: 'validation'; error: CustomError };
      body?:
        | { stage: 'validation'; error: CustomError }
        | {
            stage: 'pre-validation';
            type: 'UNSUPPORTED_MEDIA_TYPE';
            message: string;
            supportedTypes: string[];
            requestedType: string;
          }
        | { stage: 'pre-validation'; type: 'INVALID_BODY'; message: string; cause?: unknown };
    }>();
  });
});

import { describe, test, expectTypeOf } from 'vitest';

import { type KoriEnvironment, type KoriRequest, type KoriResponse } from '../../src/context/index.js';
import { type KoriResponseSchemaBase } from '../../src/response-schema/index.js';
import { type KoriValidatorBase } from '../../src/validator/index.js';

import {
  type KoriInstanceResponseValidationFailureHandler,
  type KoriRouteResponseValidationFailureHandler,
} from '../../src/routing/response-validation-failure-handler.js';

describe('Response validation failure handler types', () => {
  describe('KoriInstanceResponseValidationFailureHandler', () => {
    test('returns function type when validator is provided', () => {
      type MockValidator = KoriValidatorBase & { provider: 'test' };

      expectTypeOf<
        KoriInstanceResponseValidationFailureHandler<KoriEnvironment, KoriRequest, KoriResponse, MockValidator>
      >().toBeFunction();
    });

    test('returns never when validator is undefined', () => {
      expectTypeOf<
        KoriInstanceResponseValidationFailureHandler<KoriEnvironment, KoriRequest, KoriResponse, undefined>
      >().toEqualTypeOf<never>();
    });
  });

  describe('KoriRouteResponseValidationFailureHandler', () => {
    test('returns function type when both validator and schema are provided', () => {
      type MockValidator = KoriValidatorBase & { provider: 'test' };
      type MockSchema = KoriResponseSchemaBase & { provider: 'test' };

      expectTypeOf<
        KoriRouteResponseValidationFailureHandler<
          KoriEnvironment,
          KoriRequest,
          KoriResponse,
          '/test/path',
          MockValidator,
          MockSchema
        >
      >().toBeFunction();
    });

    test('returns never when validator is provided but schema is undefined', () => {
      type MockValidator = KoriValidatorBase & { provider: 'test' };

      expectTypeOf<
        KoriRouteResponseValidationFailureHandler<
          KoriEnvironment,
          KoriRequest,
          KoriResponse,
          '/test/path',
          MockValidator,
          undefined
        >
      >().toEqualTypeOf<never>();
    });

    test('returns never when validator is undefined', () => {
      type MockSchema = KoriResponseSchemaBase & { provider: 'test' };

      expectTypeOf<
        KoriRouteResponseValidationFailureHandler<
          KoriEnvironment,
          KoriRequest,
          KoriResponse,
          '/test/path',
          undefined,
          MockSchema
        >
      >().toEqualTypeOf<never>();
    });
  });
});

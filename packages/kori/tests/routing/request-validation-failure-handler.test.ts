import { describe, test, expectTypeOf } from 'vitest';

import { type KoriEnvironment, type KoriRequest, type KoriResponse } from '../../src/context/index.js';
import { type KoriRequestSchemaBase } from '../../src/request-schema/index.js';
import { type KoriValidatorBase } from '../../src/validator/index.js';

import {
  type KoriInstanceRequestValidationFailureHandler,
  type KoriRouteRequestValidationFailureHandler,
} from '../../src/routing/request-validation-failure-handler.js';

describe('Request validation failure handler types', () => {
  describe('KoriInstanceRequestValidationFailureHandler', () => {
    test('returns function type when validator is provided', () => {
      type MockValidator = KoriValidatorBase & { provider: 'test' };

      expectTypeOf<
        KoriInstanceRequestValidationFailureHandler<KoriEnvironment, KoriRequest, KoriResponse, MockValidator>
      >().toBeFunction();
    });

    test('returns never when validator is undefined', () => {
      expectTypeOf<
        KoriInstanceRequestValidationFailureHandler<KoriEnvironment, KoriRequest, KoriResponse, undefined>
      >().toEqualTypeOf<never>();
    });
  });

  describe('KoriRouteRequestValidationFailureHandler', () => {
    test('returns function type when both validator and schema are provided', () => {
      type MockValidator = KoriValidatorBase & { provider: 'test' };
      type MockSchema = KoriRequestSchemaBase & { provider: 'test' };

      expectTypeOf<
        KoriRouteRequestValidationFailureHandler<
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
        KoriRouteRequestValidationFailureHandler<
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
      type MockSchema = KoriRequestSchemaBase & { provider: 'test' };

      expectTypeOf<
        KoriRouteRequestValidationFailureHandler<
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

import { describe, test, expectTypeOf } from 'vitest';

import { createKoriRequestSchema } from '../../src/request-schema/index.js';
import { createKoriResponseSchema } from '../../src/response-schema/index.js';
import { succeed } from '../../src/util/index.js';
import { createKoriValidator } from '../../src/validator/index.js';

import {
  type RequestProviderConstraint,
  type ResponseProviderConstraint,
} from '../../src/routing/provider-constraint.js';

const ProviderA = 'provider-a';
const ProviderB = 'provider-b';

describe('RequestProviderConstraint', () => {
  test('allows matching providers', () => {
    const _validatorA = createKoriValidator({
      provider: ProviderA,
      validate: (options) => succeed(options.value as any),
    });

    const _schemaA = createKoriRequestSchema({
      provider: ProviderA,
    });

    expectTypeOf<RequestProviderConstraint<typeof _validatorA, typeof _schemaA>>().toEqualTypeOf<unknown>();
  });

  test('rejects mismatched providers', () => {
    const _validatorA = createKoriValidator({
      provider: ProviderA,
      validate: (options) => succeed(options.value as any),
    });

    const _schemaB = createKoriRequestSchema({
      provider: ProviderB,
    });

    expectTypeOf<RequestProviderConstraint<typeof _validatorA, typeof _schemaB>>().toEqualTypeOf<{
      _ProviderMismatch: 'Request validator and request schema providers do not match';
    }>();
  });

  test('allows undefined validator or schema', () => {
    const _validatorA = createKoriValidator({
      provider: ProviderA,
      validate: (options) => succeed(options.value as any),
    });

    const _schemaA = createKoriRequestSchema({
      provider: ProviderA,
    });

    expectTypeOf<RequestProviderConstraint<typeof _validatorA, undefined>>().toEqualTypeOf<unknown>();
    expectTypeOf<RequestProviderConstraint<undefined, typeof _schemaA>>().toEqualTypeOf<unknown>();
    expectTypeOf<RequestProviderConstraint<undefined, undefined>>().toEqualTypeOf<unknown>();
  });
});

describe('ResponseProviderConstraint', () => {
  test('allows matching providers', () => {
    const _validatorA = createKoriValidator({
      provider: ProviderA,
      validate: (options) => succeed(options.value as any),
    });

    const _schemaA = createKoriResponseSchema({
      provider: ProviderA,
    });

    expectTypeOf<ResponseProviderConstraint<typeof _validatorA, typeof _schemaA>>().toEqualTypeOf<unknown>();
  });

  test('rejects mismatched providers', () => {
    const _validatorA = createKoriValidator({
      provider: ProviderA,
      validate: (options) => succeed(options.value as any),
    });

    const _schemaB = createKoriResponseSchema({
      provider: ProviderB,
    });

    expectTypeOf<ResponseProviderConstraint<typeof _validatorA, typeof _schemaB>>().toEqualTypeOf<{
      _ProviderMismatch: 'Response validator and response schema providers do not match';
    }>();
  });

  test('allows undefined validator or schema', () => {
    const _validatorA = createKoriValidator({
      provider: ProviderA,
      validate: (options) => succeed(options.value as any),
    });

    const _schemaA = createKoriResponseSchema({
      provider: ProviderA,
    });

    expectTypeOf<ResponseProviderConstraint<typeof _validatorA, undefined>>().toEqualTypeOf<unknown>();
    expectTypeOf<ResponseProviderConstraint<undefined, typeof _schemaA>>().toEqualTypeOf<unknown>();
    expectTypeOf<ResponseProviderConstraint<undefined, undefined>>().toEqualTypeOf<unknown>();
  });
});

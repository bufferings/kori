import { describe, test, expectTypeOf } from 'vitest';

import { createKoriRequestSchema } from '../../src/request-schema/index.js';
import { createKoriRequestValidator } from '../../src/request-validator/index.js';
import { createKoriResponseSchema } from '../../src/response-schema/index.js';
import { createKoriResponseValidator } from '../../src/response-validator/index.js';
import { createKoriSchema } from '../../src/schema/index.js';
import { succeed } from '../../src/util/index.js';

import {
  type RequestProviderConstraint,
  type ResponseProviderConstraint,
} from '../../src/routing/provider-constraint.js';

const ProviderA = Symbol('provider-a');
const ProviderB = Symbol('provider-b');

describe('RequestProviderConstraint', () => {
  test('allows matching providers', () => {
    const _validatorA = createKoriRequestValidator({
      provider: ProviderA,
      validateParams: () => succeed({}),
      validateQueries: () => succeed({}),
      validateHeaders: () => succeed({}),
      validateBody: () => succeed({}),
    });

    const _schemaA = createKoriRequestSchema({
      provider: ProviderA,
      body: createKoriSchema({ provider: ProviderA, definition: {} }),
    });

    expectTypeOf<RequestProviderConstraint<typeof _validatorA, typeof _schemaA>>().toEqualTypeOf<unknown>();
  });

  test('rejects mismatched providers', () => {
    const _validatorA = createKoriRequestValidator({
      provider: ProviderA,
      validateParams: () => succeed({}),
      validateQueries: () => succeed({}),
      validateHeaders: () => succeed({}),
      validateBody: () => succeed({}),
    });

    const _schemaB = createKoriRequestSchema({
      provider: ProviderB,
      body: createKoriSchema({ provider: ProviderB, definition: {} }),
    });

    expectTypeOf<RequestProviderConstraint<typeof _validatorA, typeof _schemaB>>().toEqualTypeOf<{
      _ProviderMismatch: 'Request validator and request schema providers do not match';
    }>();
  });

  test('allows undefined validator or schema', () => {
    const _validatorA = createKoriRequestValidator({
      provider: ProviderA,
      validateParams: () => succeed({}),
      validateQueries: () => succeed({}),
      validateHeaders: () => succeed({}),
      validateBody: () => succeed({}),
    });

    const _schemaA = createKoriRequestSchema({
      provider: ProviderA,
      body: createKoriSchema({ provider: ProviderA, definition: {} }),
    });

    expectTypeOf<RequestProviderConstraint<typeof _validatorA, undefined>>().toEqualTypeOf<unknown>();
    expectTypeOf<RequestProviderConstraint<undefined, typeof _schemaA>>().toEqualTypeOf<unknown>();
    expectTypeOf<RequestProviderConstraint<undefined, undefined>>().toEqualTypeOf<unknown>();
  });
});

describe('ResponseProviderConstraint', () => {
  test('allows matching providers', () => {
    const _validatorA = createKoriResponseValidator({
      provider: ProviderA,
      validateBody: () => succeed({}),
    });

    const _schemaA = createKoriResponseSchema({
      provider: ProviderA,
      responses: {
        '200': createKoriSchema({ provider: ProviderA, definition: {} }),
      },
    });

    expectTypeOf<ResponseProviderConstraint<typeof _validatorA, typeof _schemaA>>().toEqualTypeOf<unknown>();
  });

  test('rejects mismatched providers', () => {
    const _validatorA = createKoriResponseValidator({
      provider: ProviderA,
      validateBody: () => succeed({}),
    });

    const _schemaB = createKoriResponseSchema({
      provider: ProviderB,
      responses: {
        '200': createKoriSchema({ provider: ProviderB, definition: {} }),
      },
    });

    expectTypeOf<ResponseProviderConstraint<typeof _validatorA, typeof _schemaB>>().toEqualTypeOf<{
      _ProviderMismatch: 'Response validator and response schema providers do not match';
    }>();
  });

  test('allows undefined validator or schema', () => {
    const _validatorA = createKoriResponseValidator({
      provider: ProviderA,
      validateBody: () => succeed({}),
    });

    const _schemaA = createKoriResponseSchema({
      provider: ProviderA,
      responses: {
        '200': createKoriSchema({ provider: ProviderA, definition: {} }),
      },
    });

    expectTypeOf<ResponseProviderConstraint<typeof _validatorA, undefined>>().toEqualTypeOf<unknown>();
    expectTypeOf<ResponseProviderConstraint<undefined, typeof _schemaA>>().toEqualTypeOf<unknown>();
    expectTypeOf<ResponseProviderConstraint<undefined, undefined>>().toEqualTypeOf<unknown>();
  });
});

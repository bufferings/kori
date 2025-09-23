import { describe, expectTypeOf, test } from 'vitest';

import { type KoriRequest } from '../../src/context/index.js';
import { createKoriRequestSchema } from '../../src/request-schema/index.js';
import { createKoriSchema } from '../../src/schema/index.js';
import { succeed } from '../../src/util/index.js';
import { createKoriValidator } from '../../src/validator/index.js';

import { type ValidatedRequest } from '../../src/routing/validated-request.js';

const testProvider = 'test-provider';

describe('ValidatedRequest', () => {
  test('extends request with validation methods when both validator and schema present', () => {
    const _validator = createKoriValidator({
      provider: testProvider,
      validate: (options) => succeed(options.value as any),
    });

    const paramsSchema = createKoriSchema<typeof testProvider, { type: 'object' }, { id: string }>({
      provider: testProvider,
      definition: { type: 'object' },
    });
    const queriesSchema = createKoriSchema<typeof testProvider, { type: 'object' }, { page: number }>({
      provider: testProvider,
      definition: { type: 'object' },
    });
    const headersSchema = createKoriSchema<typeof testProvider, { type: 'object' }, { authorization: string }>({
      provider: testProvider,
      definition: { type: 'object' },
    });
    const bodySchema = createKoriSchema<typeof testProvider, { type: 'object' }, { name: string; email: string }>({
      provider: testProvider,
      definition: { type: 'object' },
    });

    const _requestSchema = createKoriRequestSchema({
      provider: testProvider,
      params: paramsSchema,
      queries: queriesSchema,
      headers: headersSchema,
      body: bodySchema,
    });

    type BaseRequest = KoriRequest & { customProp: string };
    expectTypeOf<ValidatedRequest<BaseRequest, typeof _validator, typeof _requestSchema>>().toEqualTypeOf<
      BaseRequest & {
        validatedParams(): { id: string };
        validatedQueries(): { page: number };
        validatedHeaders(): { authorization: string };
        validatedBody(): { name: string; email: string };
      }
    >();
  });

  test('handles never types for undefined schemas', () => {
    const _validator = createKoriValidator({
      provider: testProvider,
      validate: (options) => succeed(options.value as any),
    });

    const _requestSchema = createKoriRequestSchema({
      provider: testProvider,
    });

    type BaseRequest = KoriRequest & { customProp: string };
    expectTypeOf<ValidatedRequest<BaseRequest, typeof _validator, typeof _requestSchema>>().toEqualTypeOf<
      BaseRequest & {
        validatedParams(): never;
        validatedQueries(): never;
        validatedHeaders(): never;
        validatedBody(): never;
      }
    >();
  });

  test('returns base request when validator is undefined', () => {
    const bodySchema = createKoriSchema<typeof testProvider, { type: 'object' }, { name: string }>({
      provider: testProvider,
      definition: { type: 'object' },
    });

    const _requestSchema = createKoriRequestSchema({
      provider: testProvider,
      body: bodySchema,
    });

    type BaseRequest = KoriRequest & { customProp: string };
    expectTypeOf<ValidatedRequest<BaseRequest, undefined, typeof _requestSchema>>().toEqualTypeOf<BaseRequest>();
  });

  test('returns base request when schema is undefined', () => {
    const _validator = createKoriValidator({
      provider: testProvider,
      validate: (options) => succeed(options.value as any),
    });

    type BaseRequest = KoriRequest & { customProp: string };
    expectTypeOf<ValidatedRequest<BaseRequest, typeof _validator, undefined>>().toEqualTypeOf<BaseRequest>();
  });

  test('returns base request when both validator and schema are undefined', () => {
    type BaseRequest = KoriRequest & { customProp: string };
    expectTypeOf<ValidatedRequest<BaseRequest, undefined, undefined>>().toEqualTypeOf<BaseRequest>();
  });

  test('returns base request when validator and schema providers do not match', () => {
    const _validatorA = createKoriValidator({
      provider: 'provider-a',
      validate: (options) => succeed(options.value as any),
    });

    const bodySchemaB = createKoriSchema<'provider-b', { type: 'object' }, { data: string }>({
      provider: 'provider-b',
      definition: { type: 'object' },
    });

    const _requestSchemaB = createKoriRequestSchema({
      provider: 'provider-b',
      body: bodySchemaB,
    });

    type BaseRequest = KoriRequest & { customProp: string };
    expectTypeOf<
      ValidatedRequest<BaseRequest, typeof _validatorA, typeof _requestSchemaB>
    >().toEqualTypeOf<BaseRequest>();
  });
});

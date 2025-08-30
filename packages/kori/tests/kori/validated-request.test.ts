import { describe, expectTypeOf, test } from 'vitest';

import { type KoriRequest } from '../../src/context/index.js';
import { createKoriRequestSchema } from '../../src/request-schema/index.js';
import { createKoriRequestValidator } from '../../src/request-validator/index.js';
import { createKoriSchema } from '../../src/schema/index.js';
import { ok } from '../../src/util/index.js';

import { type InferValidatedRequest } from '../../src/kori/validated-request.js';

const TestProvider = Symbol('test-provider');

describe('InferValidatedRequest', () => {
  test('extends request with validation methods when both validator and schema present', () => {
    const _validator = createKoriRequestValidator({
      provider: TestProvider,
      validateParams: () => ok('test'),
      validateQueries: () => ok('test'),
      validateHeaders: () => ok('test'),
      validateBody: () => ok('test'),
    });

    const paramsSchema = createKoriSchema<typeof TestProvider, { type: 'object' }, { id: string }>({
      provider: TestProvider,
      definition: { type: 'object' },
    });
    const queriesSchema = createKoriSchema<typeof TestProvider, { type: 'object' }, { page: number }>({
      provider: TestProvider,
      definition: { type: 'object' },
    });
    const headersSchema = createKoriSchema<typeof TestProvider, { type: 'object' }, { authorization: string }>({
      provider: TestProvider,
      definition: { type: 'object' },
    });
    const bodySchema = createKoriSchema<typeof TestProvider, { type: 'object' }, { name: string; email: string }>({
      provider: TestProvider,
      definition: { type: 'object' },
    });

    const _requestSchema = createKoriRequestSchema({
      provider: TestProvider,
      params: paramsSchema,
      queries: queriesSchema,
      headers: headersSchema,
      body: bodySchema,
    });

    type BaseRequest = KoriRequest & { customProp: string };
    type ValidatedRequest = InferValidatedRequest<BaseRequest, typeof _validator, typeof _requestSchema>;

    expectTypeOf<ValidatedRequest>().toEqualTypeOf<
      BaseRequest & {
        validatedParams(): { id: string };
        validatedQueries(): { page: number };
        validatedHeaders(): { authorization: string };
        validatedBody(): { name: string; email: string };
      }
    >();
  });

  test('handles never types for undefined schemas', () => {
    const _validator = createKoriRequestValidator({
      provider: TestProvider,
      validateParams: () => ok('test'),
      validateQueries: () => ok('test'),
      validateHeaders: () => ok('test'),
      validateBody: () => ok('test'),
    });

    const _requestSchema = createKoriRequestSchema({
      provider: TestProvider,
    });

    type BaseRequest = KoriRequest & { customProp: string };
    type ValidatedRequest = InferValidatedRequest<BaseRequest, typeof _validator, typeof _requestSchema>;

    expectTypeOf<ValidatedRequest>().toEqualTypeOf<
      BaseRequest & {
        validatedParams(): never;
        validatedQueries(): never;
        validatedHeaders(): never;
        validatedBody(): never;
      }
    >();
  });

  test('returns base request when validator is undefined', () => {
    const bodySchema = createKoriSchema({
      provider: TestProvider,
      definition: { type: 'object' },
    });

    const _requestSchema = createKoriRequestSchema({
      provider: TestProvider,
      body: bodySchema,
    });

    type BaseRequest = KoriRequest & { customProp: string };
    type ValidatedRequest = InferValidatedRequest<BaseRequest, undefined, typeof _requestSchema>;

    expectTypeOf<ValidatedRequest>().toEqualTypeOf<BaseRequest>();
  });

  test('returns base request when schema is undefined', () => {
    const _validator = createKoriRequestValidator({
      provider: TestProvider,
      validateParams: () => ok('test'),
      validateQueries: () => ok('test'),
      validateHeaders: () => ok('test'),
      validateBody: () => ok('test'),
    });

    type BaseRequest = KoriRequest & { customProp: string };
    type ValidatedRequest = InferValidatedRequest<BaseRequest, typeof _validator, undefined>;

    expectTypeOf<ValidatedRequest>().toEqualTypeOf<BaseRequest>();
  });

  test('returns base request when both validator and schema are undefined', () => {
    type BaseRequest = KoriRequest & { customProp: string };
    type ValidatedRequest = InferValidatedRequest<BaseRequest, undefined, undefined>;

    expectTypeOf<ValidatedRequest>().toEqualTypeOf<BaseRequest>();
  });
});

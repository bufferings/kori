import { describe, expectTypeOf, test } from 'vitest';

import { createKoriSchema } from '../../src/schema/schema.js';
import {
  type InferResponseSchemaBodyOutputByStatusCode,
  type InferResponseSchemaProvider,
} from '../../src/schema-response/infer.js';
import { createKoriResponseSchema } from '../../src/schema-response/response-schema.js';

const TestProvider = Symbol('test-provider');

describe('InferResponseSchemaProvider', () => {
  test('extracts provider from response schema', () => {
    const userSchema = createKoriSchema({
      provider: TestProvider,
      definition: { type: 'object' },
    });

    const _responseSchema = createKoriResponseSchema({
      provider: TestProvider,
      responses: { '200': userSchema },
    });

    type Provider = InferResponseSchemaProvider<typeof _responseSchema>;
    expectTypeOf<Provider>().toEqualTypeOf<typeof TestProvider>();
  });
});

describe('InferResponseSchemaBodyOutputByStatusCode', () => {
  const userSchema = createKoriSchema<
    typeof TestProvider,
    { type: 'object' },
    { id: number; name: string; email: string }
  >({
    provider: TestProvider,
    definition: { type: 'object' },
  });

  const errorSchema = createKoriSchema<typeof TestProvider, { type: 'object' }, { error: string; code: number }>({
    provider: TestProvider,
    definition: { type: 'object' },
  });

  describe('body type variations', () => {
    test('infers simple body', () => {
      const _responseSchema = createKoriResponseSchema({
        provider: TestProvider,
        responses: {
          '200': userSchema,
        },
      });

      type Output = InferResponseSchemaBodyOutputByStatusCode<typeof _responseSchema, '200'>;
      expectTypeOf<Output>().toEqualTypeOf<{ id: number; name: string; email: string }>();
    });

    test('infers simple body wrapper', () => {
      const _responseSchema = createKoriResponseSchema({
        provider: TestProvider,
        responses: {
          '200': {
            schema: userSchema,
            description: 'User data',
            examples: {
              sample: { id: 1, name: 'Alice', email: 'alice@example.com' },
            },
          },
        },
      });

      type Output = InferResponseSchemaBodyOutputByStatusCode<typeof _responseSchema, '200'>;
      expectTypeOf<Output>().toEqualTypeOf<{ id: number; name: string; email: string }>();
    });

    test('infers content body', () => {
      const _responseSchema = createKoriResponseSchema({
        provider: TestProvider,
        responses: {
          '200': {
            content: {
              'application/json': userSchema,
            },
          },
        },
      });

      type Output = InferResponseSchemaBodyOutputByStatusCode<typeof _responseSchema, '200'>;
      expectTypeOf<Output>().toEqualTypeOf<{
        mediaType: 'application/json';
        value: { id: number; name: string; email: string };
      }>();
    });

    test('infers content body wrapper', () => {
      const _responseSchema = createKoriResponseSchema({
        provider: TestProvider,
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: userSchema,
                examples: {
                  sample: { id: 1, name: 'Alice', email: 'alice@example.com' },
                },
              },
            },
          },
        },
      });

      type Output = InferResponseSchemaBodyOutputByStatusCode<typeof _responseSchema, '200'>;
      expectTypeOf<Output>().toEqualTypeOf<{
        mediaType: 'application/json';
        value: { id: number; name: string; email: string };
      }>();
    });

    test('infers multiple content types', () => {
      const xmlUserSchema = createKoriSchema<typeof TestProvider, { type: 'object' }, { userId: string }>({
        provider: TestProvider,
        definition: { type: 'object' },
      });

      const _responseSchema = createKoriResponseSchema({
        provider: TestProvider,
        responses: {
          '200': {
            content: {
              'application/json': userSchema,
              'application/xml': xmlUserSchema,
            },
          },
        },
      });

      type Output = InferResponseSchemaBodyOutputByStatusCode<typeof _responseSchema, '200'>;
      expectTypeOf<Output>().toEqualTypeOf<
        | { mediaType: 'application/json'; value: { id: number; name: string; email: string } }
        | { mediaType: 'application/xml'; value: { userId: string } }
      >();
    });
  });

  describe('status code matching', () => {
    test('infers exact status code match', () => {
      const _responseSchema = createKoriResponseSchema({
        provider: TestProvider,
        responses: {
          '200': userSchema,
          '404': {
            content: {
              'application/json': errorSchema,
              'application/xml': errorSchema,
            },
          },
          '4XX': {
            content: {
              'application/json': errorSchema,
            },
          },
          '5XX': {
            content: {
              'application/json': errorSchema,
            },
          },
        },
      });

      type Out200 = InferResponseSchemaBodyOutputByStatusCode<typeof _responseSchema, '200'>;
      expectTypeOf<Out200>().toEqualTypeOf<{ id: number; name: string; email: string }>();

      type Out404 = InferResponseSchemaBodyOutputByStatusCode<typeof _responseSchema, '404'>;
      expectTypeOf<Out404>().toEqualTypeOf<
        | { mediaType: 'application/json'; value: { error: string; code: number } }
        | { mediaType: 'application/xml'; value: { error: string; code: number } }
      >();
    });

    test('infers class wildcard fallback', () => {
      const _responseSchema = createKoriResponseSchema({
        provider: TestProvider,
        responses: {
          '200': userSchema,
          '404': {
            content: {
              'application/json': errorSchema,
              'application/xml': errorSchema,
            },
          },
          '4XX': {
            content: {
              'application/json': errorSchema,
            },
          },
          '5XX': {
            content: {
              'application/json': errorSchema,
            },
          },
        },
      });

      // 429 -> 4XX fallback
      type Out429 = InferResponseSchemaBodyOutputByStatusCode<typeof _responseSchema, '429'>;
      expectTypeOf<Out429>().toEqualTypeOf<{
        mediaType: 'application/json';
        value: { error: string; code: number };
      }>();

      // 503 -> 5XX fallback
      type Out503 = InferResponseSchemaBodyOutputByStatusCode<typeof _responseSchema, '503'>;
      expectTypeOf<Out503>().toEqualTypeOf<{
        mediaType: 'application/json';
        value: { error: string; code: number };
      }>();
    });

    test('infers default fallback', () => {
      const _schemaWithDefault = createKoriResponseSchema({
        provider: TestProvider,
        responses: {
          '200': userSchema,
          default: {
            content: {
              'application/json': errorSchema,
            },
          },
        },
      });

      // 999 -> default fallback (no class wildcard match)
      type Out999 = InferResponseSchemaBodyOutputByStatusCode<typeof _schemaWithDefault, '999'>;
      expectTypeOf<Out999>().toEqualTypeOf<{
        mediaType: 'application/json';
        value: { error: string; code: number };
      }>();
    });

    test('returns never for no match', () => {
      const _responseSchema = createKoriResponseSchema({
        provider: TestProvider,
        responses: {
          '200': userSchema,
        },
      });

      // 999 -> no match (no default)
      type Out999 = InferResponseSchemaBodyOutputByStatusCode<typeof _responseSchema, '999'>;
      expectTypeOf<Out999>().toEqualTypeOf<never>();
    });

    test('precedence: exact > class wildcard > default', () => {
      const _schemaWithPrecedence = createKoriResponseSchema({
        provider: TestProvider,
        responses: {
          '404': userSchema,
          '4XX': {
            content: { 'application/json': errorSchema },
          },
          default: {
            content: { 'text/plain': errorSchema },
          },
        },
      });

      // Should match exact '404', not '4XX' or 'default'
      type Out404 = InferResponseSchemaBodyOutputByStatusCode<typeof _schemaWithPrecedence, '404'>;
      expectTypeOf<Out404>().toEqualTypeOf<{ id: number; name: string; email: string }>();
    });
  });
});

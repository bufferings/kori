import { describe, expectTypeOf, test } from 'vitest';

import {
  type InferResponseSchemaBodyOutputByStatusCode,
  type InferResponseSchemaProvider,
} from '../../src/response-schema/inference.js';
import { createKoriResponseSchema } from '../../src/response-schema/schema.js';
import { createKoriSchema } from '../../src/schema/schema.js';

const testProvider = 'test-provider';

describe('InferResponseSchemaProvider', () => {
  test('infers provider from response schema', () => {
    const userSchema = createKoriSchema({
      provider: testProvider,
      definition: { type: 'object' },
    });

    const _responseSchema = createKoriResponseSchema({
      provider: testProvider,
      responses: { '200': userSchema },
    });

    type Provider = InferResponseSchemaProvider<typeof _responseSchema>;
    expectTypeOf<Provider>().toEqualTypeOf<typeof testProvider>();
  });
});

describe('InferResponseSchemaBodyOutputByStatusCode', () => {
  const userSchema = createKoriSchema<
    typeof testProvider,
    { type: 'object' },
    { id: number; name: string; email: string }
  >({
    provider: testProvider,
    definition: { type: 'object' },
  });

  const errorSchema = createKoriSchema<typeof testProvider, { type: 'object' }, { error: string; code: number }>({
    provider: testProvider,
    definition: { type: 'object' },
  });

  test('infers simple body output type (direct schema)', () => {
    const _responseSchema = createKoriResponseSchema({
      provider: testProvider,
      responses: {
        '200': userSchema,
      },
    });

    type Output = InferResponseSchemaBodyOutputByStatusCode<typeof _responseSchema, '200'>;
    expectTypeOf<Output>().toEqualTypeOf<{ id: number; name: string; email: string }>();
  });

  test('infers simple body output type (with metadata)', () => {
    const _responseSchema = createKoriResponseSchema({
      provider: testProvider,
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

  test('infers content body output type (direct schema)', () => {
    const _responseSchema = createKoriResponseSchema({
      provider: testProvider,
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

  test('infers content body output type (schema with examples)', () => {
    const _responseSchema = createKoriResponseSchema({
      provider: testProvider,
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

  test('infers content body output type (multiple content types)', () => {
    const xmlUserSchema = createKoriSchema<typeof testProvider, { type: 'object' }, { userId: string }>({
      provider: testProvider,
      definition: { type: 'object' },
    });

    const _responseSchema = createKoriResponseSchema({
      provider: testProvider,
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

  test('infers exact status code match', () => {
    const _responseSchema = createKoriResponseSchema({
      provider: testProvider,
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

  test('infers class wildcard fallback for status codes', () => {
    const _responseSchema = createKoriResponseSchema({
      provider: testProvider,
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

  test('infers default fallback for unmatched status codes', () => {
    const _schemaWithDefault = createKoriResponseSchema({
      provider: testProvider,
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

  test('infers never when no status code matches', () => {
    const _responseSchema = createKoriResponseSchema({
      provider: testProvider,
      responses: {
        '200': userSchema,
      },
    });

    // 999 -> no match (no default)
    type Out999 = InferResponseSchemaBodyOutputByStatusCode<typeof _responseSchema, '999'>;
    expectTypeOf<Out999>().toEqualTypeOf<never>();
  });

  test('respects status code precedence (exact > class wildcard > default)', () => {
    const _schemaWithPrecedence = createKoriResponseSchema({
      provider: testProvider,
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

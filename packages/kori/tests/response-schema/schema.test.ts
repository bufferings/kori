/* eslint-disable @typescript-eslint/no-empty-object-type */
import { describe, expect, expectTypeOf, test } from 'vitest';

import {
  createKoriResponseSchema,
  getKoriResponseSchemaProvider,
  isKoriResponseSchema,
  type KoriResponseSchema,
} from '../../src/response-schema/index.js';
import { createKoriSchema } from '../../src/schema/schema.js';

const TestProvider = Symbol('test-provider');

describe('createKoriResponseSchema', () => {
  test('creates schema with provider', () => {
    const _responseSchema = createKoriResponseSchema({
      provider: TestProvider,
      responses: {},
    });

    expectTypeOf<typeof _responseSchema>().toExtend<KoriResponseSchema<typeof TestProvider, {}>>();
  });

  test('creates schema with headers', () => {
    const headersSchema = createKoriSchema({
      provider: TestProvider,
      definition: { type: 'object' },
    });

    const _responseSchema = createKoriResponseSchema({
      provider: TestProvider,
      responses: {
        '200': { headers: headersSchema, content: {} },
      },
    });

    expectTypeOf<typeof _responseSchema>().toExtend<
      KoriResponseSchema<
        typeof TestProvider,
        {
          '200': {
            headers: typeof headersSchema;
            content: {};
          };
        }
      >
    >();
  });

  test('creates schema with simple body', () => {
    const userSchema = createKoriSchema<typeof TestProvider, { type: 'object' }, { id: number }>({
      provider: TestProvider,
      definition: { type: 'object' },
    });

    const _responseSchema = createKoriResponseSchema({
      provider: TestProvider,
      responses: {
        '200': userSchema,
      },
    });

    expectTypeOf<typeof _responseSchema>().toExtend<
      KoriResponseSchema<
        typeof TestProvider,
        {
          '200': typeof userSchema;
        }
      >
    >();
  });

  test('creates schema with simple body wrapper', () => {
    const userSchema = createKoriSchema<typeof TestProvider, { type: 'object' }, { id: number }>({
      provider: TestProvider,
      definition: { type: 'object' },
    });

    const _responseSchema = createKoriResponseSchema({
      provider: TestProvider,
      responses: {
        '200': {
          schema: userSchema,
          description: 'OK',
          examples: { sample: { id: 1 } },
        },
      },
    });

    expectTypeOf<typeof _responseSchema>().toExtend<
      KoriResponseSchema<
        typeof TestProvider,
        {
          '200': {
            schema: typeof userSchema;
            description: string;
            examples: { sample: { id: number } };
          };
        }
      >
    >();
  });

  test('creates schema with content body', () => {
    const userSchema = createKoriSchema<typeof TestProvider, { type: 'object' }, { id: number }>({
      provider: TestProvider,
      definition: { type: 'object' },
    });

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

    expectTypeOf<typeof _responseSchema>().toExtend<
      KoriResponseSchema<
        typeof TestProvider,
        {
          '200': {
            content: {
              'application/json': typeof userSchema;
            };
          };
        }
      >
    >();
  });

  test('creates schema with content body wrapper', () => {
    const userSchema = createKoriSchema<typeof TestProvider, { type: 'object' }, { id: number; name: string }>({
      provider: TestProvider,
      definition: { type: 'object' },
    });

    const _responseSchema = createKoriResponseSchema({
      provider: TestProvider,
      responses: {
        '200': {
          content: {
            'application/json': {
              schema: userSchema,
              examples: {
                sample: { id: 1, name: 'Alice' },
              },
            },
          },
        },
      },
    });

    expectTypeOf<typeof _responseSchema>().toExtend<
      KoriResponseSchema<
        typeof TestProvider,
        {
          '200': {
            content: {
              'application/json': {
                schema: typeof userSchema;
                examples: {
                  sample: { id: number; name: string };
                };
              };
            };
          };
        }
      >
    >();
  });

  test('creates comprehensive API response schema', () => {
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
    const headersSchema = createKoriSchema<typeof TestProvider, { type: 'object' }, { 'x-rate-limit': number }>({
      provider: TestProvider,
      definition: { type: 'object' },
    });

    const _responseSchema = createKoriResponseSchema({
      provider: TestProvider,
      responses: {
        '200': {
          description: 'User successfully retrieved',
          headers: headersSchema,
          schema: userSchema,
          examples: {
            standard: { id: 1, name: 'Alice', email: 'alice@example.com' },
          },
        },
        '404': {
          description: 'User not found',
          content: {
            'application/json': {
              schema: errorSchema,
              examples: {
                notFound: { error: 'User not found', code: 404 },
              },
            },
            'application/xml': errorSchema,
          },
        },
        '4XX': {
          description: 'Client error',
          content: {
            'application/json': errorSchema,
          },
        },
        '5XX': {
          description: 'Server error',
          content: {
            'application/json': errorSchema,
          },
        },
      },
    });

    expectTypeOf<typeof _responseSchema>().toExtend<
      KoriResponseSchema<
        typeof TestProvider,
        {
          '200': {
            description: string;
            headers: typeof headersSchema;
            schema: typeof userSchema;
            examples: {
              standard: { id: number; name: string; email: string };
            };
          };
          '404': {
            description: string;
            content: {
              'application/json': {
                schema: typeof errorSchema;
                examples: {
                  notFound: { error: string; code: number };
                };
              };
              'application/xml': typeof errorSchema;
            };
          };
          '4XX': {
            description: string;
            content: {
              'application/json': typeof errorSchema;
            };
          };
          '5XX': {
            description: string;
            content: {
              'application/json': typeof errorSchema;
            };
          };
        }
      >
    >();
  });
});

describe('isKoriResponseSchema', () => {
  test('returns true for valid response schema', () => {
    const userSchema = createKoriSchema({
      provider: TestProvider,
      definition: { type: 'object' },
    });

    const responseSchema = createKoriResponseSchema({
      provider: TestProvider,
      responses: { '200': userSchema },
    });

    expect(isKoriResponseSchema(responseSchema)).toBe(true);
  });

  test('returns false for non-response schema values', () => {
    expect(isKoriResponseSchema(null)).toBe(false);
    expect(isKoriResponseSchema(undefined)).toBe(false);
    expect(isKoriResponseSchema({})).toBe(false);
    expect(isKoriResponseSchema('string')).toBe(false);
    expect(isKoriResponseSchema(123)).toBe(false);
  });
});

describe('getKoriResponseSchemaProvider', () => {
  test('returns the provider symbol', () => {
    const userSchema = createKoriSchema({
      provider: TestProvider,
      definition: { type: 'object' },
    });

    const responseSchema = createKoriResponseSchema({
      provider: TestProvider,
      responses: { '200': userSchema },
    });

    expect(getKoriResponseSchemaProvider(responseSchema)).toBe(TestProvider);
  });
});

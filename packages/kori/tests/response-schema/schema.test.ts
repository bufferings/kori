/* eslint-disable @typescript-eslint/no-empty-object-type */
import { describe, expect, expectTypeOf, test } from 'vitest';

import { createKoriSchema } from '../../src/schema/index.js';

import {
  createKoriResponseSchema,
  isKoriResponseSchema,
  type KoriResponseSchema,
} from '../../src/response-schema/schema.js';

const testProvider = 'test-provider';

describe('createKoriResponseSchema', () => {
  test('creates schema with provider only', () => {
    const responseSchema = createKoriResponseSchema({
      provider: testProvider,
    });

    expect(responseSchema.koriKind).toBe('kori-response-schema');
    expect(responseSchema.provider).toBe(testProvider);
    expect(responseSchema.responses).toBeUndefined();

    expectTypeOf<typeof responseSchema>().toExtend<KoriResponseSchema<typeof testProvider, {}>>();
  });

  test('creates schema with headers', () => {
    const headersSchema = createKoriSchema({
      provider: testProvider,
      definition: { type: 'object' },
    });

    const responses = {
      '200': { headers: headersSchema, content: {} },
    };

    const responseSchema = createKoriResponseSchema({
      provider: testProvider,
      responses,
    });

    expect(responseSchema.koriKind).toBe('kori-response-schema');
    expect(responseSchema.provider).toBe(testProvider);
    expect(responseSchema.responses).toBe(responses);

    expectTypeOf<typeof responseSchema>().toExtend<
      KoriResponseSchema<
        typeof testProvider,
        {
          '200': {
            headers: typeof headersSchema;
            content: {};
          };
        }
      >
    >();
  });

  test('creates schema with simple body (direct schema)', () => {
    const userSchema = createKoriSchema<typeof testProvider, { type: 'object' }, { id: number }>({
      provider: testProvider,
      definition: { type: 'object' },
    });

    const responses = {
      '200': userSchema,
    };

    const responseSchema = createKoriResponseSchema({
      provider: testProvider,
      responses,
    });

    expect(responseSchema.koriKind).toBe('kori-response-schema');
    expect(responseSchema.provider).toBe(testProvider);
    expect(responseSchema.responses).toBe(responses);

    expectTypeOf<typeof responseSchema>().toExtend<
      KoriResponseSchema<
        typeof testProvider,
        {
          '200': typeof userSchema;
        }
      >
    >();
  });

  test('creates schema with simple body (with metadata)', () => {
    const userSchema = createKoriSchema<typeof testProvider, { type: 'object' }, { id: number }>({
      provider: testProvider,
      definition: { type: 'object' },
    });

    const responses = {
      '200': {
        schema: userSchema,
        description: 'User successfully retrieved',
        examples: { sample: { id: 1 } },
      },
    };

    const responseSchema = createKoriResponseSchema({
      provider: testProvider,
      responses,
    });

    expect(responseSchema.koriKind).toBe('kori-response-schema');
    expect(responseSchema.provider).toBe(testProvider);
    expect(responseSchema.responses).toBe(responses);

    expectTypeOf<typeof responseSchema>().toExtend<
      KoriResponseSchema<
        typeof testProvider,
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

  test('creates schema with content body (direct schema)', () => {
    const userSchema = createKoriSchema<typeof testProvider, { type: 'object' }, { id: number }>({
      provider: testProvider,
      definition: { type: 'object' },
    });

    const responses = {
      '200': {
        content: {
          'application/json': userSchema,
        },
      },
    };

    const responseSchema = createKoriResponseSchema({
      provider: testProvider,
      responses,
    });

    expect(responseSchema.koriKind).toBe('kori-response-schema');
    expect(responseSchema.provider).toBe(testProvider);
    expect(responseSchema.responses).toBe(responses);

    expectTypeOf<typeof responseSchema>().toExtend<
      KoriResponseSchema<
        typeof testProvider,
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

  test('creates schema with content body (schema with examples)', () => {
    const userSchema = createKoriSchema<typeof testProvider, { type: 'object' }, { id: number; name: string }>({
      provider: testProvider,
      definition: { type: 'object' },
    });

    const responses = {
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
    };

    const responseSchema = createKoriResponseSchema({
      provider: testProvider,
      responses,
    });

    expect(responseSchema.koriKind).toBe('kori-response-schema');
    expect(responseSchema.provider).toBe(testProvider);
    expect(responseSchema.responses).toBe(responses);

    expectTypeOf<typeof responseSchema>().toExtend<
      KoriResponseSchema<
        typeof testProvider,
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

  test('creates comprehensive response schema with status codes', () => {
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
    const headersSchema = createKoriSchema<typeof testProvider, { type: 'object' }, { 'x-rate-limit': number }>({
      provider: testProvider,
      definition: { type: 'object' },
    });

    const responses = {
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
    };

    const responseSchema = createKoriResponseSchema({
      provider: testProvider,
      responses,
    });

    expect(responseSchema.koriKind).toBe('kori-response-schema');
    expect(responseSchema.provider).toBe(testProvider);
    expect(responseSchema.responses).toBe(responses);

    expectTypeOf<typeof responseSchema>().toExtend<
      KoriResponseSchema<
        typeof testProvider,
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
  test('identifies valid response schemas', () => {
    const userSchema = createKoriSchema({
      provider: testProvider,
      definition: { type: 'object' },
    });

    const responseSchema = createKoriResponseSchema({
      provider: testProvider,
      responses: { '200': userSchema },
    });

    expect(isKoriResponseSchema(responseSchema)).toBe(true);
  });

  test('rejects invalid values', () => {
    expect(isKoriResponseSchema(null)).toBe(false);
    expect(isKoriResponseSchema(undefined)).toBe(false);
    expect(isKoriResponseSchema({})).toBe(false);
    expect(isKoriResponseSchema({ koriKind: 'wrong-kind' })).toBe(false);
    expect(isKoriResponseSchema({ koriKind: 'kori-response-schema' })).toBe(true);
    expect(isKoriResponseSchema({ provider: testProvider })).toBe(false);
    expect(isKoriResponseSchema('not-an-object')).toBe(false);
    expect(isKoriResponseSchema(42)).toBe(false);
  });
});

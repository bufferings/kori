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

  test('creates schema with simple body', () => {
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

  test('creates schema with content body', () => {
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
        headers: headersSchema,
        content: {
          'application/json': userSchema,
        },
      },
      '404': errorSchema,
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
            headers: typeof headersSchema;
            content: {
              'application/json': typeof userSchema;
            };
          };
          '404': typeof errorSchema;
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

import { describe, expect, expectTypeOf, test } from 'vitest';

import { createKoriSchema } from '../../src/schema/index.js';

import {
  createKoriRequestSchema,
  isKoriRequestSchema,
  type KoriRequestSchema,
} from '../../src/request-schema/schema.js';

const testProvider = 'test-provider';

describe('createKoriRequestSchema', () => {
  test('creates schema with provider only', () => {
    const requestSchema = createKoriRequestSchema({
      provider: testProvider,
    });

    expect(requestSchema.koriKind).toBe('kori-request-schema');
    expect(requestSchema.provider).toBe(testProvider);
    expect(requestSchema.params).toBeUndefined();
    expect(requestSchema.headers).toBeUndefined();
    expect(requestSchema.queries).toBeUndefined();
    expect(requestSchema.body).toBeUndefined();

    expectTypeOf<typeof requestSchema>().toExtend<KoriRequestSchema<typeof testProvider>>();
  });

  test('creates schema with params', () => {
    const paramsSchema = createKoriSchema({
      provider: testProvider,
      definition: { type: 'object' },
    });

    const requestSchema = createKoriRequestSchema({
      provider: testProvider,
      params: paramsSchema,
    });

    expect(requestSchema.koriKind).toBe('kori-request-schema');
    expect(requestSchema.provider).toBe(testProvider);
    expect(requestSchema.params).toBe(paramsSchema);
    expect(requestSchema.headers).toBeUndefined();
    expect(requestSchema.queries).toBeUndefined();
    expect(requestSchema.body).toBeUndefined();

    expectTypeOf<typeof requestSchema>().toExtend<KoriRequestSchema<typeof testProvider, typeof paramsSchema>>();
  });

  test('creates schema with headers', () => {
    const headersSchema = createKoriSchema({
      provider: testProvider,
      definition: { type: 'object' },
    });

    const requestSchema = createKoriRequestSchema({
      provider: testProvider,
      headers: headersSchema,
    });

    expect(requestSchema.koriKind).toBe('kori-request-schema');
    expect(requestSchema.provider).toBe(testProvider);
    expect(requestSchema.params).toBeUndefined();
    expect(requestSchema.headers).toBe(headersSchema);
    expect(requestSchema.queries).toBeUndefined();
    expect(requestSchema.body).toBeUndefined();

    expectTypeOf<typeof requestSchema>().toExtend<
      KoriRequestSchema<typeof testProvider, never, typeof headersSchema>
    >();
  });

  test('creates schema with queries', () => {
    const queriesSchema = createKoriSchema({
      provider: testProvider,
      definition: { type: 'object' },
    });

    const requestSchema = createKoriRequestSchema({
      provider: testProvider,
      queries: queriesSchema,
    });

    expect(requestSchema.koriKind).toBe('kori-request-schema');
    expect(requestSchema.provider).toBe(testProvider);
    expect(requestSchema.params).toBeUndefined();
    expect(requestSchema.headers).toBeUndefined();
    expect(requestSchema.queries).toBe(queriesSchema);
    expect(requestSchema.body).toBeUndefined();

    expectTypeOf<typeof requestSchema>().toExtend<
      KoriRequestSchema<typeof testProvider, never, never, typeof queriesSchema>
    >();
  });

  test('creates schema with simple body', () => {
    const bodySchema = createKoriSchema({
      provider: testProvider,
      definition: { type: 'object' },
    });

    const requestSchema = createKoriRequestSchema({
      provider: testProvider,
      body: bodySchema,
    });

    expect(requestSchema.koriKind).toBe('kori-request-schema');
    expect(requestSchema.provider).toBe(testProvider);
    expect(requestSchema.body).toBe(bodySchema);

    expectTypeOf<typeof requestSchema>().toExtend<
      KoriRequestSchema<typeof testProvider, never, never, never, typeof bodySchema>
    >();
  });

  test('creates schema with content body', () => {
    const jsonSchema = createKoriSchema({
      provider: testProvider,
      definition: { type: 'object' },
    });

    const contentBody = {
      content: {
        'application/json': jsonSchema,
      },
    };

    const requestSchema = createKoriRequestSchema({
      provider: testProvider,
      body: contentBody,
    });

    expect(requestSchema.koriKind).toBe('kori-request-schema');
    expect(requestSchema.provider).toBe(testProvider);
    expect(requestSchema.body).toBe(contentBody);

    expectTypeOf<typeof requestSchema>().toExtend<
      KoriRequestSchema<typeof testProvider, never, never, never, never, { 'application/json': typeof jsonSchema }>
    >();
  });

  test('creates schema with content body (multiple content types)', () => {
    const jsonSchema = createKoriSchema({
      provider: testProvider,
      definition: { type: 'object' },
    });

    const xmlSchema = createKoriSchema({
      provider: testProvider,
      definition: { type: 'string' },
    });

    const contentBody = {
      description: 'Contact form submission',
      content: {
        'application/json': jsonSchema,
        'application/xml': xmlSchema,
      },
    };

    const requestSchema = createKoriRequestSchema({
      provider: testProvider,
      body: contentBody,
    });

    expect(requestSchema.koriKind).toBe('kori-request-schema');
    expect(requestSchema.provider).toBe(testProvider);
    expect(requestSchema.body).toBe(contentBody);

    expectTypeOf<typeof requestSchema>().toExtend<
      KoriRequestSchema<
        typeof testProvider,
        never,
        never,
        never,
        never,
        {
          'application/json': typeof jsonSchema;
          'application/xml': typeof xmlSchema;
        }
      >
    >();
  });

  test('creates comprehensive schema with all components', () => {
    const paramsSchema = createKoriSchema({
      provider: testProvider,
      definition: { type: 'params' },
    });
    const headersSchema = createKoriSchema({
      provider: testProvider,
      definition: { type: 'headers' },
    });
    const queriesSchema = createKoriSchema({
      provider: testProvider,
      definition: { type: 'queries' },
    });
    const bodySchema = createKoriSchema({
      provider: testProvider,
      definition: { type: 'body' },
    });

    const requestSchema = createKoriRequestSchema({
      provider: testProvider,
      params: paramsSchema,
      headers: headersSchema,
      queries: queriesSchema,
      body: bodySchema,
    });

    expect(requestSchema.koriKind).toBe('kori-request-schema');
    expect(requestSchema.provider).toBe(testProvider);
    expect(requestSchema.params).toBe(paramsSchema);
    expect(requestSchema.headers).toBe(headersSchema);
    expect(requestSchema.queries).toBe(queriesSchema);
    expect(requestSchema.body).toBe(bodySchema);

    expectTypeOf<typeof requestSchema>().toExtend<
      KoriRequestSchema<
        typeof testProvider,
        typeof paramsSchema,
        typeof headersSchema,
        typeof queriesSchema,
        typeof bodySchema
      >
    >();
  });
});

describe('isKoriRequestSchema', () => {
  test('identifies valid request schemas', () => {
    const requestSchema = createKoriRequestSchema({
      provider: testProvider,
    });

    expect(isKoriRequestSchema(requestSchema)).toBe(true);
  });

  test('rejects invalid values', () => {
    expect(isKoriRequestSchema(null)).toBe(false);
    expect(isKoriRequestSchema(undefined)).toBe(false);
    expect(isKoriRequestSchema({})).toBe(false);
    expect(isKoriRequestSchema({ koriKind: 'wrong-kind' })).toBe(false);
    expect(isKoriRequestSchema({ koriKind: 'kori-request-schema' })).toBe(true);
    expect(isKoriRequestSchema({ provider: testProvider })).toBe(false);
    expect(isKoriRequestSchema('not-an-object')).toBe(false);
    expect(isKoriRequestSchema(42)).toBe(false);
  });
});

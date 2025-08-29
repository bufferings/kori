import { describe, expect, expectTypeOf, test } from 'vitest';

import {
  createKoriRequestSchema,
  getKoriRequestSchemaProvider,
  isKoriRequestSchema,
  type KoriRequestSchema,
} from '../../src/request-schema/index.js';
import { createKoriSchema } from '../../src/schema/schema.js';

const TestProvider = Symbol('test-provider');

describe('createKoriRequestSchema', () => {
  test('creates schema with provider', () => {
    const _requestSchema = createKoriRequestSchema({
      provider: TestProvider,
    });

    expectTypeOf<typeof _requestSchema>().toExtend<KoriRequestSchema<typeof TestProvider>>();
  });

  test('creates schema with params', () => {
    const paramsSchema = createKoriSchema({
      provider: TestProvider,
      definition: { type: 'object' },
    });

    const _requestSchema = createKoriRequestSchema({
      provider: TestProvider,
      params: paramsSchema,
    });

    expectTypeOf<typeof _requestSchema>().toExtend<KoriRequestSchema<typeof TestProvider, typeof paramsSchema>>();
  });

  test('creates schema with headers', () => {
    const headersSchema = createKoriSchema({
      provider: TestProvider,
      definition: { type: 'object' },
    });

    const _requestSchema = createKoriRequestSchema({
      provider: TestProvider,
      headers: headersSchema,
    });

    expectTypeOf<typeof _requestSchema>().toExtend<
      KoriRequestSchema<typeof TestProvider, never, typeof headersSchema>
    >();
  });

  test('creates schema with queries', () => {
    const queriesSchema = createKoriSchema({
      provider: TestProvider,
      definition: { type: 'object' },
    });

    const _requestSchema = createKoriRequestSchema({
      provider: TestProvider,
      queries: queriesSchema,
    });

    expectTypeOf<typeof _requestSchema>().toExtend<
      KoriRequestSchema<typeof TestProvider, never, never, typeof queriesSchema>
    >();
  });

  test('creates schema with simple body', () => {
    const bodySchema = createKoriSchema({
      provider: TestProvider,
      definition: { type: 'object' },
    });

    const _requestSchema = createKoriRequestSchema({
      provider: TestProvider,
      body: bodySchema,
    });

    expectTypeOf<typeof _requestSchema>().toExtend<
      KoriRequestSchema<typeof TestProvider, never, never, never, typeof bodySchema>
    >();
  });

  test('creates schema with simple body wrapper', () => {
    const bodySchema = createKoriSchema({
      provider: TestProvider,
      definition: { type: 'object' },
    });

    const _requestSchema = createKoriRequestSchema({
      provider: TestProvider,
      body: {
        schema: bodySchema,
        description: 'Test schema',
        examples: { test: { name: 'test' } },
      },
    });

    expectTypeOf<typeof _requestSchema>().toExtend<
      KoriRequestSchema<typeof TestProvider, never, never, never, typeof bodySchema>
    >();
  });

  test('creates schema with content body', () => {
    const jsonSchema = createKoriSchema({
      provider: TestProvider,
      definition: { type: 'object' },
    });

    const _requestSchema = createKoriRequestSchema({
      provider: TestProvider,
      body: {
        content: {
          'application/json': jsonSchema,
        },
      },
    });

    expectTypeOf<typeof _requestSchema>().toExtend<
      KoriRequestSchema<typeof TestProvider, never, never, never, never, { 'application/json': typeof jsonSchema }>
    >();
  });

  test('creates schema with content body wrapper', () => {
    const jsonSchema = createKoriSchema({
      provider: TestProvider,
      definition: { type: 'object' },
    });

    const _requestSchema = createKoriRequestSchema({
      provider: TestProvider,
      body: {
        content: {
          'application/json': {
            schema: jsonSchema,
            examples: { sample: { name: 'Alice', email: 'alice@example.com' } },
          },
        },
      },
    });

    expectTypeOf<typeof _requestSchema>().toExtend<
      KoriRequestSchema<
        typeof TestProvider,
        never,
        never,
        never,
        never,
        { 'application/json': { schema: typeof jsonSchema; examples?: Record<string, unknown> } }
      >
    >();
  });

  test('creates schema with all components', () => {
    const paramsSchema = createKoriSchema({
      provider: TestProvider,
      definition: { type: 'object' },
    });
    const headersSchema = createKoriSchema({
      provider: TestProvider,
      definition: { type: 'object' },
    });
    const queriesSchema = createKoriSchema({
      provider: TestProvider,
      definition: { type: 'object' },
    });
    const bodySchema = createKoriSchema({
      provider: TestProvider,
      definition: { type: 'object' },
    });

    const _requestSchema = createKoriRequestSchema({
      provider: TestProvider,
      params: paramsSchema,
      headers: headersSchema,
      queries: queriesSchema,
      body: bodySchema,
    });

    expectTypeOf<typeof _requestSchema>().toExtend<
      KoriRequestSchema<
        typeof TestProvider,
        typeof paramsSchema,
        typeof headersSchema,
        typeof queriesSchema,
        typeof bodySchema
      >
    >();
  });
});

describe('isKoriRequestSchema', () => {
  test('identifies request schemas', () => {
    const requestSchema = createKoriRequestSchema({
      provider: TestProvider,
    });

    expect(isKoriRequestSchema(requestSchema)).toBe(true);
    expect(isKoriRequestSchema({})).toBe(false);
    expect(isKoriRequestSchema(null)).toBe(false);
    expect(isKoriRequestSchema(undefined)).toBe(false);
  });
});

describe('getKoriRequestSchemaProvider', () => {
  test('returns provider', () => {
    const requestSchema = createKoriRequestSchema({
      provider: TestProvider,
    });

    expect(getKoriRequestSchemaProvider(requestSchema)).toBe(TestProvider);
  });
});

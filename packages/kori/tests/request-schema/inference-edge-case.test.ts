/**
 * Type inference tests with type aliases.
 *
 * These tests verify that body output types are inferred correctly when using
 * type aliases for request schemas. The PhantomProperty field in KoriRequestSchema
 * ensures type parameter preservation through type aliases.
 */

import { describe, expectTypeOf, test } from 'vitest';

import { createKoriSchema, isKoriSchema } from '../../src/schema/index.js';

import { type InferRequestSchemaBodyOutput } from '../../src/request-schema/inference.js';
import { createKoriRequestSchema, type KoriRequestSchema } from '../../src/request-schema/schema.js';
import { type KoriSchema, type KoriSchemaOf } from '../../src/schema/schema.js';

const testProvider = 'test-provider';

type TestRequestSchema<
  Body extends KoriSchemaOf<typeof testProvider>,
  BodyMapping extends Record<string, KoriSchemaOf<typeof testProvider>>,
> = KoriRequestSchema<
  typeof testProvider,
  KoriSchema<typeof testProvider, never, never>,
  KoriSchema<typeof testProvider, never, never>,
  KoriSchema<typeof testProvider, never, never>,
  KoriSchema<typeof testProvider, never, never>,
  Body,
  BodyMapping
>;

function createTestRequestSchema<Body extends KoriSchemaOf<typeof testProvider>>(options: {
  body: Body;
}): TestRequestSchema<Body, never>;

function createTestRequestSchema<BodyMapping extends Record<string, KoriSchemaOf<typeof testProvider>>>(options: {
  body: { content: BodyMapping };
}): TestRequestSchema<never, BodyMapping>;

function createTestRequestSchema<
  Body extends KoriSchemaOf<typeof testProvider>,
  BodyMapping extends Record<string, KoriSchemaOf<typeof testProvider>>,
>(options: { body: Body | { content: BodyMapping } }): TestRequestSchema<Body, BodyMapping> {
  if (isKoriSchema(options.body)) {
    return createKoriRequestSchema({
      provider: testProvider,
      body: options.body,
    });
  } else {
    return createKoriRequestSchema({
      provider: testProvider,
      body: options.body,
    });
  }
}

describe('InferRequestSchemaBodyOutput with type aliases', () => {
  test('infers simple body output type through type alias', () => {
    const userSchema = createKoriSchema<typeof testProvider, { type: 'object' }, { name: string; email: string }>({
      provider: testProvider,
      definition: { type: 'object' },
    });

    const _requestSchema = createTestRequestSchema({
      body: userSchema,
    });

    expectTypeOf<InferRequestSchemaBodyOutput<typeof _requestSchema>>().toEqualTypeOf<{
      name: string;
      email: string;
    }>();
  });

  test('infers content body output type through type alias', () => {
    const userSchema = createKoriSchema<typeof testProvider, { type: 'object' }, { name: string; email: string }>({
      provider: testProvider,
      definition: { type: 'object' },
    });

    const _requestSchema = createTestRequestSchema({
      body: {
        content: {
          'application/json': userSchema,
        },
      },
    });

    expectTypeOf<InferRequestSchemaBodyOutput<typeof _requestSchema>>().toEqualTypeOf<{
      mediaType: 'application/json';
      value: { name: string; email: string };
    }>();
  });
});

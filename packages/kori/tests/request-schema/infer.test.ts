import { describe, expectTypeOf, test } from 'vitest';

import { createKoriSchema } from '../../src/schema/index.js';

import {
  type InferRequestSchemaBodyOutput,
  type InferRequestSchemaHeadersOutput,
  type InferRequestSchemaParamsOutput,
  type InferRequestSchemaQueriesOutput,
} from '../../src/request-schema/infer.js';
import { createKoriRequestSchema } from '../../src/request-schema/schema.js';

const TestProvider = Symbol('test-provider');

describe('InferRequestSchemaParamsOutput', () => {
  test('returns output type when params schema is defined', () => {
    const paramsSchema = createKoriSchema<typeof TestProvider, { type: 'params' }, { id: string }>({
      provider: TestProvider,
      definition: { type: 'params' },
    });

    const _requestSchema = createKoriRequestSchema({
      provider: TestProvider,
      params: paramsSchema,
    });

    expectTypeOf<InferRequestSchemaParamsOutput<typeof _requestSchema>>().toEqualTypeOf<{ id: string }>();
  });

  test('returns never when params schema is not defined', () => {
    const _requestSchema = createKoriRequestSchema({
      provider: TestProvider,
    });

    expectTypeOf<InferRequestSchemaParamsOutput<typeof _requestSchema>>().toEqualTypeOf<never>();
  });
});

describe('InferRequestSchemaHeadersOutput', () => {
  test('returns output type when headers schema is defined', () => {
    const headersSchema = createKoriSchema<typeof TestProvider, { type: 'headers' }, { authorization: string }>({
      provider: TestProvider,
      definition: { type: 'headers' },
    });

    const _requestSchema = createKoriRequestSchema({
      provider: TestProvider,
      headers: headersSchema,
    });

    expectTypeOf<InferRequestSchemaHeadersOutput<typeof _requestSchema>>().toEqualTypeOf<{ authorization: string }>();
  });

  test('returns never when headers schema is not defined', () => {
    const _requestSchema = createKoriRequestSchema({
      provider: TestProvider,
    });

    expectTypeOf<InferRequestSchemaHeadersOutput<typeof _requestSchema>>().toEqualTypeOf<never>();
  });
});

describe('InferRequestSchemaQueriesOutput', () => {
  test('returns output type when queries schema is defined', () => {
    const queriesSchema = createKoriSchema<typeof TestProvider, { type: 'queries' }, { page: number; limit: number }>({
      provider: TestProvider,
      definition: { type: 'queries' },
    });

    const _requestSchema = createKoriRequestSchema({
      provider: TestProvider,
      queries: queriesSchema,
    });

    expectTypeOf<InferRequestSchemaQueriesOutput<typeof _requestSchema>>().toEqualTypeOf<{
      page: number;
      limit: number;
    }>();
  });

  test('returns never when queries schema is not defined', () => {
    const _requestSchema = createKoriRequestSchema({
      provider: TestProvider,
    });

    expectTypeOf<InferRequestSchemaQueriesOutput<typeof _requestSchema>>().toEqualTypeOf<never>();
  });
});

describe('InferRequestSchemaBodyOutput', () => {
  const userSchema = createKoriSchema<typeof TestProvider, { type: 'object' }, { name: string; email: string }>({
    provider: TestProvider,
    definition: { type: 'object' },
  });

  describe('Simple Body', () => {
    test('extracts output type from simple body schema', () => {
      const _requestSchema = createKoriRequestSchema({
        provider: TestProvider,
        body: userSchema,
      });

      expectTypeOf<InferRequestSchemaBodyOutput<typeof _requestSchema>>().toEqualTypeOf<{
        name: string;
        email: string;
      }>();
    });

    test('extracts output type from schema wrapper object', () => {
      const _requestSchema = createKoriRequestSchema({
        provider: TestProvider,
        body: {
          schema: userSchema,
          description: 'User schema',
          examples: { sample: { name: 'John Doe', email: 'john.doe@example.com' } },
        },
      });

      expectTypeOf<InferRequestSchemaBodyOutput<typeof _requestSchema>>().toEqualTypeOf<{
        name: string;
        email: string;
      }>();
    });

    test('returns never when no body schema', () => {
      const _requestSchema = createKoriRequestSchema({
        provider: TestProvider,
      });

      expectTypeOf<InferRequestSchemaBodyOutput<typeof _requestSchema>>().toEqualTypeOf<never>();
    });
  });

  describe('Content Body', () => {
    test('creates union type for single content type', () => {
      const _requestSchema = createKoriRequestSchema({
        provider: TestProvider,
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

    test('creates union type for multiple content types', () => {
      const stringSchema = createKoriSchema<typeof TestProvider, { type: 'string' }, string>({
        provider: TestProvider,
        definition: { type: 'string' },
      });
      const numberSchema = createKoriSchema<typeof TestProvider, { type: 'number' }, number>({
        provider: TestProvider,
        definition: { type: 'number' },
      });

      const _requestSchema = createKoriRequestSchema({
        provider: TestProvider,
        body: {
          content: {
            'application/json': userSchema,
            'text/plain': stringSchema,
            'application/octet-stream': numberSchema,
          },
        },
      });

      expectTypeOf<InferRequestSchemaBodyOutput<typeof _requestSchema>>().toEqualTypeOf<
        | { mediaType: 'application/json'; value: { name: string; email: string } }
        | { mediaType: 'text/plain'; value: string }
        | { mediaType: 'application/octet-stream'; value: number }
      >();
    });

    test('handles schema wrapper objects', () => {
      const stringSchema = createKoriSchema<typeof TestProvider, { type: 'string' }, string>({
        provider: TestProvider,
        definition: { type: 'string' },
      });

      const _requestSchema = createKoriRequestSchema({
        provider: TestProvider,
        body: {
          content: {
            'application/json': {
              schema: userSchema,
              examples: { sample: { name: 'Alice', email: 'alice@example.com' } },
            },
            'text/plain': stringSchema,
          },
        },
      });

      expectTypeOf<InferRequestSchemaBodyOutput<typeof _requestSchema>>().toEqualTypeOf<
        | { mediaType: 'application/json'; value: { name: string; email: string } }
        | { mediaType: 'text/plain'; value: string }
      >();
    });

    test('handles mixed direct and wrapped schemas', () => {
      const formSchema = createKoriSchema<typeof TestProvider, { type: 'form' }, Record<string, string>>({
        provider: TestProvider,
        definition: { type: 'form' },
      });
      const xmlSchema = createKoriSchema<typeof TestProvider, { type: 'xml' }, { root: { data: string } }>({
        provider: TestProvider,
        definition: { type: 'xml' },
      });

      const _requestSchema = createKoriRequestSchema({
        provider: TestProvider,
        body: {
          content: {
            'application/json': userSchema,
            'application/x-www-form-urlencoded': { schema: formSchema },
            'application/xml': { schema: xmlSchema, examples: { sample: { root: { data: 'test' } } } },
          },
        },
      });

      expectTypeOf<InferRequestSchemaBodyOutput<typeof _requestSchema>>().toEqualTypeOf<
        | { mediaType: 'application/json'; value: { name: string; email: string } }
        | { mediaType: 'application/x-www-form-urlencoded'; value: Record<string, string> }
        | { mediaType: 'application/xml'; value: { root: { data: string } } }
      >();
    });

    test('preserves literal media type strings', () => {
      const _requestSchema = createKoriRequestSchema({
        provider: TestProvider,
        body: {
          content: {
            'custom/media-type': userSchema,
            'application/vnd.api+json': userSchema,
          },
        },
      });

      expectTypeOf<InferRequestSchemaBodyOutput<typeof _requestSchema>>().toEqualTypeOf<
        | { mediaType: 'custom/media-type'; value: { name: string; email: string } }
        | { mediaType: 'application/vnd.api+json'; value: { name: string; email: string } }
      >();
    });

    test('edge case: empty content mapping', () => {
      const _requestSchema = createKoriRequestSchema({
        provider: TestProvider,
        body: {
          content: {},
        },
      });

      // Should return never for empty content mapping
      expectTypeOf<InferRequestSchemaBodyOutput<typeof _requestSchema>>().toEqualTypeOf<never>();
    });
  });
});

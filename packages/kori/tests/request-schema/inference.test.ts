import { describe, expectTypeOf, test } from 'vitest';

import { createKoriSchema } from '../../src/schema/index.js';

import {
  type InferRequestSchemaBodyOutput,
  type InferRequestSchemaHeadersOutput,
  type InferRequestSchemaParamsOutput,
  type InferRequestSchemaQueriesOutput,
} from '../../src/request-schema/inference.js';
import { createKoriRequestSchema } from '../../src/request-schema/schema.js';

const testProvider = 'test-provider';

describe('InferRequestSchemaParamsOutput', () => {
  test('infers params output type when defined', () => {
    const paramsSchema = createKoriSchema<typeof testProvider, { type: 'params' }, { id: string }>({
      provider: testProvider,
      definition: { type: 'params' },
    });

    const _requestSchema = createKoriRequestSchema({
      provider: testProvider,
      params: paramsSchema,
    });

    expectTypeOf<InferRequestSchemaParamsOutput<typeof _requestSchema>>().toEqualTypeOf<{ id: string }>();
  });

  test('infers never when params schema is not defined', () => {
    const _requestSchema = createKoriRequestSchema({
      provider: testProvider,
    });

    expectTypeOf<InferRequestSchemaParamsOutput<typeof _requestSchema>>().toEqualTypeOf<never>();
  });
});

describe('InferRequestSchemaHeadersOutput', () => {
  test('infers headers output type when defined', () => {
    const headersSchema = createKoriSchema<typeof testProvider, { type: 'headers' }, { authorization: string }>({
      provider: testProvider,
      definition: { type: 'headers' },
    });

    const _requestSchema = createKoriRequestSchema({
      provider: testProvider,
      headers: headersSchema,
    });

    expectTypeOf<InferRequestSchemaHeadersOutput<typeof _requestSchema>>().toEqualTypeOf<{ authorization: string }>();
  });

  test('infers never when headers schema is not defined', () => {
    const _requestSchema = createKoriRequestSchema({
      provider: testProvider,
    });

    expectTypeOf<InferRequestSchemaHeadersOutput<typeof _requestSchema>>().toEqualTypeOf<never>();
  });
});

describe('InferRequestSchemaQueriesOutput', () => {
  test('infers queries output type when defined', () => {
    const queriesSchema = createKoriSchema<typeof testProvider, { type: 'queries' }, { page: number; limit: number }>({
      provider: testProvider,
      definition: { type: 'queries' },
    });

    const _requestSchema = createKoriRequestSchema({
      provider: testProvider,
      queries: queriesSchema,
    });

    expectTypeOf<InferRequestSchemaQueriesOutput<typeof _requestSchema>>().toEqualTypeOf<{
      page: number;
      limit: number;
    }>();
  });

  test('infers never when queries schema is not defined', () => {
    const _requestSchema = createKoriRequestSchema({
      provider: testProvider,
    });

    expectTypeOf<InferRequestSchemaQueriesOutput<typeof _requestSchema>>().toEqualTypeOf<never>();
  });
});

describe('InferRequestSchemaBodyOutput', () => {
  const userSchema = createKoriSchema<typeof testProvider, { type: 'object' }, { name: string; email: string }>({
    provider: testProvider,
    definition: { type: 'object' },
  });

  test('infers simple body output type (direct schema)', () => {
    const _requestSchema = createKoriRequestSchema({
      provider: testProvider,
      body: userSchema,
    });

    expectTypeOf<InferRequestSchemaBodyOutput<typeof _requestSchema>>().toEqualTypeOf<{
      name: string;
      email: string;
    }>();
  });

  test('infers simple body output type (with metadata)', () => {
    const _requestSchema = createKoriRequestSchema({
      provider: testProvider,
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

  test('infers never when body schema is not defined', () => {
    const _requestSchema = createKoriRequestSchema({
      provider: testProvider,
    });

    expectTypeOf<InferRequestSchemaBodyOutput<typeof _requestSchema>>().toEqualTypeOf<never>();
  });

  test('infers content body output type (single content type)', () => {
    const _requestSchema = createKoriRequestSchema({
      provider: testProvider,
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

  test('infers content body output type (multiple content types)', () => {
    const stringSchema = createKoriSchema<typeof testProvider, { type: 'string' }, string>({
      provider: testProvider,
      definition: { type: 'string' },
    });
    const numberSchema = createKoriSchema<typeof testProvider, { type: 'number' }, number>({
      provider: testProvider,
      definition: { type: 'number' },
    });

    const _requestSchema = createKoriRequestSchema({
      provider: testProvider,
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

  test('infers content body output type (schema with examples)', () => {
    const stringSchema = createKoriSchema<typeof testProvider, { type: 'string' }, string>({
      provider: testProvider,
      definition: { type: 'string' },
    });

    const _requestSchema = createKoriRequestSchema({
      provider: testProvider,
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

  test('infers content body output type (mixed direct and wrapped schemas)', () => {
    const formSchema = createKoriSchema<typeof testProvider, { type: 'form' }, Record<string, string>>({
      provider: testProvider,
      definition: { type: 'form' },
    });
    const xmlSchema = createKoriSchema<typeof testProvider, { type: 'xml' }, { root: { data: string } }>({
      provider: testProvider,
      definition: { type: 'xml' },
    });

    const _requestSchema = createKoriRequestSchema({
      provider: testProvider,
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

  test('infers content body output type (custom media types)', () => {
    const _requestSchema = createKoriRequestSchema({
      provider: testProvider,
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

  test('infers never for empty content mapping', () => {
    const _requestSchema = createKoriRequestSchema({
      provider: testProvider,
      body: {
        content: {},
      },
    });

    // Should return never for empty content mapping
    expectTypeOf<InferRequestSchemaBodyOutput<typeof _requestSchema>>().toEqualTypeOf<never>();
  });
});

import { type KoriRequestSchema } from '@korix/kori';
import { describe, expect, expectTypeOf, test } from 'vitest';
import { z } from 'zod';

import { type KoriStdRequestSchemaContentBody, stdRequestSchema } from '../../src/std-request-schema/index.js';
import { type KoriStdSchema, STANDARD_SCHEMA_PROVIDER } from '../../src/std-schema/index.js';

describe('stdRequestSchema', () => {
  describe('simple body overload', () => {
    test('creates schema with all parameters', () => {
      const paramsSchema = z.object({ id: z.string() });
      const headersSchema = z.object({ authorization: z.string() });
      const queriesSchema = z.object({ limit: z.coerce.number() });
      const bodySchema = z.object({ name: z.string() });

      const result = stdRequestSchema({
        params: paramsSchema,
        headers: headersSchema,
        queries: queriesSchema,
        body: bodySchema,
      });

      expect(result.provider).toBe(STANDARD_SCHEMA_PROVIDER);

      expect(result.params).toEqual({
        koriKind: 'kori-schema',
        provider: STANDARD_SCHEMA_PROVIDER,
        definition: paramsSchema,
      });
      expect(result.headers).toEqual({
        koriKind: 'kori-schema',
        provider: STANDARD_SCHEMA_PROVIDER,
        definition: headersSchema,
      });
      expect(result.queries).toEqual({
        koriKind: 'kori-schema',
        provider: STANDARD_SCHEMA_PROVIDER,
        definition: queriesSchema,
      });
      expect(result.body).toEqual({
        koriKind: 'kori-schema',
        provider: STANDARD_SCHEMA_PROVIDER,
        definition: bodySchema,
      });
    });

    test('creates schema with only params', () => {
      const paramsSchema = z.object({ id: z.string() });

      const result = stdRequestSchema({
        params: paramsSchema,
      });

      expect(result.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect(result.params).toEqual({
        koriKind: 'kori-schema',
        provider: STANDARD_SCHEMA_PROVIDER,
        definition: paramsSchema,
      });
      expect(result.headers).toBeUndefined();
      expect(result.queries).toBeUndefined();
      expect(result.body).toBeUndefined();
    });

    test('creates schema with only headers', () => {
      const headersSchema = z.object({ 'x-api-key': z.string() });

      const result = stdRequestSchema({
        headers: headersSchema,
      });

      expect(result.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect(result.params).toBeUndefined();
      expect(result.headers).toEqual({
        koriKind: 'kori-schema',
        provider: STANDARD_SCHEMA_PROVIDER,
        definition: headersSchema,
      });
      expect(result.queries).toBeUndefined();
      expect(result.body).toBeUndefined();
    });

    test('creates schema with only queries', () => {
      const queriesSchema = z.object({ page: z.number(), size: z.number() });

      const result = stdRequestSchema({
        queries: queriesSchema,
      });

      expect(result.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect(result.params).toBeUndefined();
      expect(result.headers).toBeUndefined();
      expect(result.queries).toEqual({
        koriKind: 'kori-schema',
        provider: STANDARD_SCHEMA_PROVIDER,
        definition: queriesSchema,
      });
      expect(result.body).toBeUndefined();
    });

    test('creates schema with only body', () => {
      const bodySchema = z.object({ name: z.string() });

      const result = stdRequestSchema({
        body: bodySchema,
      });

      expect(result.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect(result.params).toBeUndefined();
      expect(result.headers).toBeUndefined();
      expect(result.queries).toBeUndefined();
      expect(result.body).toEqual({
        koriKind: 'kori-schema',
        provider: STANDARD_SCHEMA_PROVIDER,
        definition: bodySchema,
      });
    });

    test('creates schema with empty options', () => {
      const result = stdRequestSchema({});

      expect(result.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect(result.params).toBeUndefined();
      expect(result.headers).toBeUndefined();
      expect(result.queries).toBeUndefined();
      expect(result.body).toBeUndefined();
    });
  });

  describe('content mapping overload', () => {
    test('creates schema with content-type mapping', () => {
      const paramsSchema = z.object({ id: z.string() });
      const jsonBodySchema = z.object({ data: z.string() });
      const formBodySchema = z.object({ file: z.any() });

      const result = stdRequestSchema({
        params: paramsSchema,
        body: {
          description: 'Mixed content types',
          content: {
            'application/json': jsonBodySchema,
            'multipart/form-data': formBodySchema,
          },
        },
      });

      expect(result.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect(result.params).toEqual({
        koriKind: 'kori-schema',
        provider: STANDARD_SCHEMA_PROVIDER,
        definition: paramsSchema,
      });
      expect(result.body).toEqual({
        description: 'Mixed content types',
        content: {
          'application/json': {
            koriKind: 'kori-schema',
            provider: STANDARD_SCHEMA_PROVIDER,
            definition: jsonBodySchema,
          },
          'multipart/form-data': {
            koriKind: 'kori-schema',
            provider: STANDARD_SCHEMA_PROVIDER,
            definition: formBodySchema,
          },
        },
      });
    });

    test('creates schema with { schema } form (no parseType)', () => {
      const jsonSchema = z.object({ data: z.string() });

      const result = stdRequestSchema({
        body: {
          content: {
            'application/json': {
              schema: jsonSchema,
            },
          },
        },
      });

      expect(result.body).toEqual({
        content: {
          'application/json': {
            schema: {
              koriKind: 'kori-schema',
              provider: STANDARD_SCHEMA_PROVIDER,
              definition: jsonSchema,
            },
          },
        },
      });
    });

    test('creates schema with { schema, parseType } form', () => {
      const binarySchema = z.instanceof(ArrayBuffer);

      const result = stdRequestSchema({
        body: {
          content: {
            'application/octet-stream': {
              schema: binarySchema,
              parseType: 'binary',
            },
          },
        },
      });

      expect(result.body).toEqual({
        content: {
          'application/octet-stream': {
            schema: {
              koriKind: 'kori-schema',
              provider: STANDARD_SCHEMA_PROVIDER,
              definition: binarySchema,
            },
            parseType: 'binary',
          },
        },
      });
    });
  });

  describe('type contracts', () => {
    test('returns correct type for simple body', () => {
      const paramsSchema = z.object({ id: z.string() });
      const bodySchema = z.object({ name: z.string() });

      const result = stdRequestSchema({
        params: paramsSchema,
        body: bodySchema,
      });

      expectTypeOf(result).toExtend<
        KoriRequestSchema<
          'standard-schema',
          KoriStdSchema<typeof paramsSchema>,
          KoriStdSchema<never>,
          KoriStdSchema<never>,
          KoriStdSchema<never>,
          KoriStdSchema<typeof bodySchema>,
          never
        >
      >();
    });

    test('returns correct type for content mapping', () => {
      const paramsSchema = z.object({ id: z.string() });
      const jsonBodySchema = z.object({ data: z.string() });

      const result = stdRequestSchema({
        params: paramsSchema,
        body: {
          content: {
            'application/json': jsonBodySchema,
          },
        },
      });

      expectTypeOf(result).toExtend<
        KoriRequestSchema<
          'standard-schema',
          KoriStdSchema<typeof paramsSchema>,
          KoriStdSchema<never>,
          KoriStdSchema<never>,
          KoriStdSchema<never>,
          never,
          { 'application/json': KoriStdSchema<typeof jsonBodySchema> }
        >
      >();
    });

    test('handles never types for omitted parameters', () => {
      const result = stdRequestSchema({});

      expectTypeOf(result).toExtend<
        KoriRequestSchema<
          'standard-schema',
          KoriStdSchema<never>,
          KoriStdSchema<never>,
          KoriStdSchema<never>,
          KoriStdSchema<never>,
          KoriStdSchema<never>,
          never
        >
      >();
    });
  });

  describe('edge cases', () => {
    test('handles undefined body gracefully', () => {
      const result = stdRequestSchema({
        params: z.object({ id: z.string() }),
        body: undefined,
      });

      expect(result.body).toBeUndefined();
    });

    test('handles complex nested Standard Schema schemas', () => {
      const nestedSchema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string(),
            settings: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
          }),
        }),
        metadata: z.array(z.object({ key: z.string(), value: z.unknown() })),
      });

      const result = stdRequestSchema({
        body: nestedSchema,
      });

      expect(result.body).toEqual({
        koriKind: 'kori-schema',
        provider: STANDARD_SCHEMA_PROVIDER,
        definition: nestedSchema,
      });
    });
  });

  describe('KoriStdRequestSchemaContentBody', () => {
    test('accepts direct schema with description', () => {
      const jsonSchema = z.object({ data: z.string() });
      const _contentBody = {
        description: 'Content body',
        content: {
          'application/json': jsonSchema,
        },
      };

      expectTypeOf<typeof _contentBody>().toExtend<
        KoriStdRequestSchemaContentBody<{ 'application/json': typeof jsonSchema }>
      >();
    });

    test('accepts direct schema without description', () => {
      const jsonSchema = z.object({ data: z.string() });
      const _contentBody = {
        content: {
          'application/json': jsonSchema,
        },
      };

      expectTypeOf<typeof _contentBody>().toExtend<
        KoriStdRequestSchemaContentBody<{ 'application/json': typeof jsonSchema }>
      >();
    });

    test('accepts { schema } with description', () => {
      const jsonSchema = z.object({ data: z.string() });
      const _contentBody = {
        description: 'JSON content',
        content: {
          'application/json': {
            schema: jsonSchema,
          },
        },
      };

      expectTypeOf<typeof _contentBody>().toExtend<
        KoriStdRequestSchemaContentBody<{ 'application/json': typeof jsonSchema }>
      >();
    });

    test('accepts { schema } without description', () => {
      const jsonSchema = z.object({ data: z.string() });
      const _contentBody = {
        content: {
          'application/json': {
            schema: jsonSchema,
          },
        },
      };

      expectTypeOf<typeof _contentBody>().toExtend<
        KoriStdRequestSchemaContentBody<{ 'application/json': typeof jsonSchema }>
      >();
    });

    test('accepts { schema, parseType } with description', () => {
      const binarySchema = z.instanceof(ArrayBuffer);
      const _contentBody = {
        description: 'Binary content',
        content: {
          'application/octet-stream': {
            schema: binarySchema,
            parseType: 'binary' as const,
          },
        },
      };

      expectTypeOf<typeof _contentBody>().toExtend<
        KoriStdRequestSchemaContentBody<{ 'application/octet-stream': typeof binarySchema }>
      >();
    });

    test('accepts { schema, parseType } without description', () => {
      const binarySchema = z.instanceof(ArrayBuffer);
      const _contentBody = {
        content: {
          'application/octet-stream': {
            schema: binarySchema,
            parseType: 'binary' as const,
          },
        },
      };

      expectTypeOf<typeof _contentBody>().toExtend<
        KoriStdRequestSchemaContentBody<{ 'application/octet-stream': typeof binarySchema }>
      >();
    });
  });
});

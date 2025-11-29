import { type KoriRequestSchema, type KoriSchemaBase } from '@korix/kori';
import { describe, expect, expectTypeOf, test } from 'vitest';
import { z } from 'zod';

import { type KoriZodRequestSchemaContentBody, zodRequestSchema } from '../../src/zod-request-schema/index.js';
import { type KoriZodSchema, ZOD_SCHEMA_PROVIDER } from '../../src/zod-schema/index.js';

describe('zodRequestSchema', () => {
  describe('simple body overload', () => {
    test('creates schema with all parameters', () => {
      const paramsSchema = z.object({ id: z.string() });
      const headersSchema = z.object({ authorization: z.string() });
      const queriesSchema = z.object({ limit: z.coerce.number() });
      const bodySchema = z.object({ name: z.string() });

      const result = zodRequestSchema({
        params: paramsSchema,
        headers: headersSchema,
        queries: queriesSchema,
        body: bodySchema,
      });

      expect(result.provider).toBe(ZOD_SCHEMA_PROVIDER);

      expect(result.params).toEqual({
        koriKind: 'kori-schema',
        provider: ZOD_SCHEMA_PROVIDER,
        definition: paramsSchema,
      });
      expect(result.headers).toEqual({
        koriKind: 'kori-schema',
        provider: ZOD_SCHEMA_PROVIDER,
        definition: headersSchema,
      });
      expect(result.queries).toEqual({
        koriKind: 'kori-schema',
        provider: ZOD_SCHEMA_PROVIDER,
        definition: queriesSchema,
      });
      expect(result.body).toEqual({
        koriKind: 'kori-schema',
        provider: ZOD_SCHEMA_PROVIDER,
        definition: bodySchema,
      });
    });

    test('creates schema with only params', () => {
      const paramsSchema = z.object({ id: z.string() });

      const result = zodRequestSchema({
        params: paramsSchema,
      });

      expect(result.provider).toBe(ZOD_SCHEMA_PROVIDER);
      expect(result.params).toEqual({
        koriKind: 'kori-schema',
        provider: ZOD_SCHEMA_PROVIDER,
        definition: paramsSchema,
      });
      expect(result.headers).toBeUndefined();
      expect(result.queries).toBeUndefined();
      expect(result.body).toBeUndefined();
    });

    test('creates schema with only headers', () => {
      const headersSchema = z.object({ 'x-api-key': z.string() });

      const result = zodRequestSchema({
        headers: headersSchema,
      });

      expect(result.provider).toBe(ZOD_SCHEMA_PROVIDER);
      expect(result.params).toBeUndefined();
      expect(result.headers).toEqual({
        koriKind: 'kori-schema',
        provider: ZOD_SCHEMA_PROVIDER,
        definition: headersSchema,
      });
      expect(result.queries).toBeUndefined();
      expect(result.body).toBeUndefined();
    });

    test('creates schema with only queries', () => {
      const queriesSchema = z.object({ page: z.number(), size: z.number() });

      const result = zodRequestSchema({
        queries: queriesSchema,
      });

      expect(result.provider).toBe(ZOD_SCHEMA_PROVIDER);
      expect(result.params).toBeUndefined();
      expect(result.headers).toBeUndefined();
      expect(result.queries).toEqual({
        koriKind: 'kori-schema',
        provider: ZOD_SCHEMA_PROVIDER,
        definition: queriesSchema,
      });
      expect(result.body).toBeUndefined();
    });

    test('creates schema with only body', () => {
      const bodySchema = z.object({ name: z.string() });

      const result = zodRequestSchema({
        body: bodySchema,
      });

      expect(result.provider).toBe(ZOD_SCHEMA_PROVIDER);
      expect(result.params).toBeUndefined();
      expect(result.headers).toBeUndefined();
      expect(result.queries).toBeUndefined();
      expect(result.body).toEqual({
        koriKind: 'kori-schema',
        provider: ZOD_SCHEMA_PROVIDER,
        definition: bodySchema,
      });
    });

    test('creates schema with empty options', () => {
      const result = zodRequestSchema({});

      expect(result.provider).toBe(ZOD_SCHEMA_PROVIDER);
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

      const result = zodRequestSchema({
        params: paramsSchema,
        body: {
          description: 'Mixed content types',
          content: {
            'application/json': jsonBodySchema,
            'multipart/form-data': formBodySchema,
          },
        },
      });

      expect(result.provider).toBe(ZOD_SCHEMA_PROVIDER);
      expect(result.params).toEqual({
        koriKind: 'kori-schema',
        provider: ZOD_SCHEMA_PROVIDER,
        definition: paramsSchema,
      });
      expect(result.body).toEqual({
        description: 'Mixed content types',
        content: {
          'application/json': {
            koriKind: 'kori-schema',
            provider: ZOD_SCHEMA_PROVIDER,
            definition: jsonBodySchema,
          },
          'multipart/form-data': {
            koriKind: 'kori-schema',
            provider: ZOD_SCHEMA_PROVIDER,
            definition: formBodySchema,
          },
        },
      });
    });

    test('creates schema with { schema } form (no parseType)', () => {
      const jsonSchema = z.object({ data: z.string() });

      const result = zodRequestSchema({
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
              provider: ZOD_SCHEMA_PROVIDER,
              definition: jsonSchema,
            },
          },
        },
      });
    });

    test('creates schema with { schema, parseType } form', () => {
      const binarySchema = z.instanceof(ArrayBuffer);

      const result = zodRequestSchema({
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
              provider: ZOD_SCHEMA_PROVIDER,
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

      const result = zodRequestSchema({
        params: paramsSchema,
        body: bodySchema,
      });

      expectTypeOf(result).toExtend<
        KoriRequestSchema<
          'zod',
          KoriZodSchema<typeof paramsSchema>,
          KoriZodSchema<never>,
          KoriZodSchema<never>,
          KoriZodSchema<never>,
          KoriZodSchema<typeof bodySchema>,
          never
        >
      >();
    });

    test('returns correct type for content mapping', () => {
      const paramsSchema = z.object({ id: z.string() });
      const jsonBodySchema = z.object({ data: z.string() });

      const result = zodRequestSchema({
        params: paramsSchema,
        body: {
          content: {
            'application/json': jsonBodySchema,
          },
        },
      });

      expectTypeOf(result).toExtend<
        KoriRequestSchema<
          'zod',
          KoriZodSchema<typeof paramsSchema>,
          KoriZodSchema<never>,
          KoriZodSchema<never>,
          KoriZodSchema<never>,
          never,
          { 'application/json': KoriZodSchema<typeof jsonBodySchema> }
        >
      >();
    });

    test('handles never types for omitted parameters', () => {
      const result = zodRequestSchema({});

      expectTypeOf(result).toExtend<
        KoriRequestSchema<
          'zod',
          KoriZodSchema<never>,
          KoriZodSchema<never>,
          KoriZodSchema<never>,
          KoriZodSchema<never>,
          KoriZodSchema<never>,
          never
        >
      >();
    });
  });

  describe('edge cases', () => {
    test('handles undefined body gracefully', () => {
      const result = zodRequestSchema({
        params: z.object({ id: z.string() }),
        body: undefined,
      });

      expect(result.body).toBeUndefined();
    });

    test('handles complex nested Zod schemas', () => {
      const nestedSchema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string(),
            settings: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
          }),
        }),
        metadata: z.array(z.object({ key: z.string(), value: z.unknown() })),
      });

      const result = zodRequestSchema({
        body: nestedSchema,
      });

      const body = result.body as KoriSchemaBase;
      expect(body.definition).toBe(nestedSchema);
    });
  });

  describe('KoriZodRequestSchemaContentBody', () => {
    test('accepts direct schema with description', () => {
      const jsonSchema = z.object({ data: z.string() });
      const _contentBody = {
        description: 'Content body',
        content: {
          'application/json': jsonSchema,
        },
      };

      expectTypeOf<typeof _contentBody>().toExtend<
        KoriZodRequestSchemaContentBody<{ 'application/json': typeof jsonSchema }>
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
        KoriZodRequestSchemaContentBody<{ 'application/json': typeof jsonSchema }>
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
        KoriZodRequestSchemaContentBody<{ 'application/json': typeof jsonSchema }>
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
        KoriZodRequestSchemaContentBody<{ 'application/json': typeof jsonSchema }>
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
        KoriZodRequestSchemaContentBody<{ 'application/octet-stream': typeof binarySchema }>
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
        KoriZodRequestSchemaContentBody<{ 'application/octet-stream': typeof binarySchema }>
      >();
    });
  });
});

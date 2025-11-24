import { type KoriRequestSchema, type KoriSchemaBase } from '@korix/kori';
import { describe, test, expect, expectTypeOf } from 'vitest';
import { z } from 'zod';

import { stdRequestSchema, type KoriStdRequestSchemaContentBody } from '../../src/std-request-schema/index.js';
import { STANDARD_SCHEMA_PROVIDER, type KoriStdSchema } from '../../src/std-schema/index.js';

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
      expect(result.params?.definition).toBe(paramsSchema);
      expect(result.headers?.definition).toBe(headersSchema);
      expect(result.queries?.definition).toBe(queriesSchema);

      const body = result.body as KoriSchemaBase;
      expect(body.definition).toBe(bodySchema);
    });

    test('creates schema with only params', () => {
      const paramsSchema = z.object({ id: z.string() });

      const result = stdRequestSchema({
        params: paramsSchema,
      });

      expect(result.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect(result.params?.definition).toBe(paramsSchema);
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
      expect(result.headers?.definition).toBe(headersSchema);
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
      expect(result.queries?.definition).toBe(queriesSchema);
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
      expect(result.body).toEqual(
        expect.objectContaining({
          provider: STANDARD_SCHEMA_PROVIDER,
          definition: bodySchema,
        }),
      );
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
      expect(result.params?.definition).toBe(paramsSchema);
      expect(result.body).toEqual({
        description: 'Mixed content types',
        content: {
          'application/json': expect.objectContaining({
            provider: STANDARD_SCHEMA_PROVIDER,
            definition: jsonBodySchema,
          }),
          'multipart/form-data': expect.objectContaining({
            provider: STANDARD_SCHEMA_PROVIDER,
            definition: formBodySchema,
          }),
        },
      });
    });

    test('handles empty content mapping', () => {
      const result = stdRequestSchema({
        body: {
          content: {},
        },
      });

      expect(result.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect(result.body).toMatchObject({
        description: undefined,
        content: {},
      });
    });

    test('handles content with description only', () => {
      const result = stdRequestSchema({
        body: {
          description: 'Empty content',
          content: {},
        },
      });

      expect(result.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect(result.body).toMatchObject({
        description: 'Empty content',
        content: {},
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

      const body = result.body as KoriSchemaBase;
      expect(body.definition).toBe(nestedSchema);
    });
  });

  describe('type definitions', () => {
    test('KoriStdRequestSchemaContentBody accepts content mapping', () => {
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
  });
});

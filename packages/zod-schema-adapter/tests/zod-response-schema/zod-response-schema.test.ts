import { type KoriResponseSchema, type KoriResponseSchemaContentEntry, type KoriSchemaOf } from '@korix/kori';
import { describe, expect, test, expectTypeOf } from 'vitest';
import { z } from 'zod';

import { zodResponseSchema } from '../../src/zod-response-schema/index.js';
import {
  ZOD_SCHEMA_PROVIDER,
  createKoriZodSchema,
  type KoriZodSchema,
  type KoriZodSchemaProvider,
} from '../../src/zod-schema/index.js';

describe('zodResponseSchema', () => {
  describe('simple schema responses', () => {
    test('creates response schema with direct Zod schema', () => {
      const stringSchema = z.string();
      const responseSchema = zodResponseSchema({
        '200': stringSchema,
      });

      expect(responseSchema.provider).toBe(ZOD_SCHEMA_PROVIDER);
      expect(responseSchema.responses).toHaveProperty('200');
      expect(responseSchema.responses?.['200']).toEqual(createKoriZodSchema(stringSchema));
    });

    test('handles multiple status codes', () => {
      const responseSchema = zodResponseSchema({
        '200': z.object({ message: z.string() }),
        '400': z.object({ error: z.string() }),
        '500': z.object({ error: z.string(), details: z.string().optional() }),
      });

      expect(responseSchema.provider).toBe(ZOD_SCHEMA_PROVIDER);
      expect(responseSchema.responses).toHaveProperty('200');
      expect(responseSchema.responses).toHaveProperty('400');
      expect(responseSchema.responses).toHaveProperty('500');
    });
  });

  describe('content-based responses', () => {
    test('creates response schema with content mapping', () => {
      const jsonSchema = z.object({ data: z.string() });
      const xmlSchema = z.string();

      const responseSchema = zodResponseSchema({
        '200': {
          content: {
            'application/json': jsonSchema,
            'application/xml': xmlSchema,
          },
          description: 'Multi-format response',
        },
      });

      expect(responseSchema.provider).toBe(ZOD_SCHEMA_PROVIDER);
      const entry = responseSchema.responses?.['200'];

      expect(entry).toMatchObject({
        description: 'Multi-format response',
        content: {
          'application/json': createKoriZodSchema(jsonSchema),
          'application/xml': createKoriZodSchema(xmlSchema),
        },
      });
    });

    test('handles content entries with description and headers', () => {
      const bodySchema = z.object({ id: z.string() });
      const headerSchema = z.object({ location: z.string() });

      const responseSchema = zodResponseSchema({
        '201': {
          description: 'Resource created',
          headers: headerSchema,
          content: {
            'application/json': bodySchema,
          },
        },
      });

      expect(responseSchema.provider).toBe(ZOD_SCHEMA_PROVIDER);
      const entry = responseSchema.responses?.['201'];

      expect(entry).toMatchObject({
        description: 'Resource created',
        headers: createKoriZodSchema(headerSchema),
        content: {
          'application/json': createKoriZodSchema(bodySchema),
        },
      });
    });
  });

  describe('mixed response formats', () => {
    test('handles combination of different entry formats', () => {
      const responseSchema = zodResponseSchema({
        '200': z.object({ success: z.boolean() }),
        '400': {
          content: {
            'application/json': z.object({ error: z.string() }),
            'text/plain': z.string(),
          },
        },
      });

      expect(responseSchema.provider).toBe(ZOD_SCHEMA_PROVIDER);
      expect(responseSchema.responses).toHaveProperty('200');
      expect(responseSchema.responses).toHaveProperty('400');

      // 200: Direct Zod schema entry check
      const entry200 = responseSchema.responses?.['200'];
      expect(entry200).toMatchObject({
        koriKind: 'kori-schema',
        provider: ZOD_SCHEMA_PROVIDER,
      });
      expect((entry200 as any)?.definition?.def?.type).toBe('object');

      // 400: Content-based entry check
      const entry400 = responseSchema.responses?.['400'];
      expect(entry400).toMatchObject({
        description: undefined,
        headers: undefined,
      });
      expect((entry400 as any)?.content?.['application/json']?.koriKind).toBe('kori-schema');
      expect((entry400 as any)?.content?.['application/json']?.provider).toBe(ZOD_SCHEMA_PROVIDER);
      expect((entry400 as any)?.content?.['text/plain']?.koriKind).toBe('kori-schema');
      expect((entry400 as any)?.content?.['text/plain']?.provider).toBe(ZOD_SCHEMA_PROVIDER);
    });
  });

  describe('status code handling', () => {
    test('handles wildcard and default status codes', () => {
      const dataSchema = z.object({ data: z.string() });
      const clientErrorSchema = z.object({ error: z.string(), code: z.number() });
      const serverErrorSchema = z.object({ error: z.string(), stack: z.string().optional() });
      const defaultSchema = z.object({ message: z.string() });

      const responseSchema = zodResponseSchema({
        '200': dataSchema,
        '4XX': clientErrorSchema,
        '5XX': serverErrorSchema,
        default: defaultSchema,
      });

      expect(responseSchema.provider).toBe(ZOD_SCHEMA_PROVIDER);

      expect(responseSchema.responses?.['200']).toEqual(createKoriZodSchema(dataSchema));
      expect(responseSchema.responses?.['4XX']).toEqual(createKoriZodSchema(clientErrorSchema));
      expect(responseSchema.responses?.['5XX']).toEqual(createKoriZodSchema(serverErrorSchema));
      expect(responseSchema.responses?.default).toEqual(createKoriZodSchema(defaultSchema));
    });

    test('handles numeric and string status codes consistently', () => {
      const stringSchema = z.object({ data: z.string() });
      const idSchema = z.object({ id: z.string() });

      const responseSchema = zodResponseSchema({
        200: stringSchema,
        '201': stringSchema,
        202: idSchema,
        '203': idSchema,
      });

      expect(responseSchema.provider).toBe(ZOD_SCHEMA_PROVIDER);

      // Verify both numeric and string keys are normalized to strings with correct schemas
      expect(responseSchema.responses?.['200']).toEqual(createKoriZodSchema(stringSchema));
      expect(responseSchema.responses?.['201']).toEqual(createKoriZodSchema(stringSchema));
      expect(responseSchema.responses?.['202']).toEqual(createKoriZodSchema(idSchema));
      expect(responseSchema.responses?.['203']).toEqual(createKoriZodSchema(idSchema));
    });
  });

  describe('edge cases', () => {
    test('handles empty responses object', () => {
      const responseSchema = zodResponseSchema({});

      expect(responseSchema.provider).toBe(ZOD_SCHEMA_PROVIDER);
      expect(responseSchema.responses).toEqual({});
    });

    test('skips undefined entries', () => {
      const stringSchema = z.string();
      const responses = {
        '200': stringSchema,
        '201': undefined,
      };

      const responseSchema = zodResponseSchema(responses);

      expect(responseSchema.responses?.['200']).toEqual(createKoriZodSchema(stringSchema));
      expect(responseSchema.responses).not.toHaveProperty('201');
    });

    test('handles empty content object', () => {
      const responseSchema = zodResponseSchema({
        '204': {
          description: 'No Content',
          content: {},
        },
      });

      expect(responseSchema.provider).toBe(ZOD_SCHEMA_PROVIDER);
      expect(responseSchema.responses?.['204']).toMatchObject({
        description: 'No Content',
        content: {},
        headers: undefined,
      });
    });

    test('handles minimal content entry', () => {
      const stringSchema = z.string();
      const responseSchema = zodResponseSchema({
        '204': {
          content: {
            'text/plain': stringSchema,
          },
        },
      });

      expect(responseSchema.provider).toBe(ZOD_SCHEMA_PROVIDER);
      expect(responseSchema.responses?.['204']).toEqual({
        description: undefined,
        headers: undefined,
        content: {
          'text/plain': createKoriZodSchema(stringSchema),
        },
      });
    });
  });

  describe('type contracts', () => {
    test('infers correct response schema type for simple entries', () => {
      const schema200 = z.object({ message: z.string() });
      const schema404 = z.object({ error: z.string() });
      const responseSchema = zodResponseSchema({
        '200': schema200,
        '404': schema404,
      });

      expectTypeOf(responseSchema).toExtend<
        KoriResponseSchema<
          KoriZodSchemaProvider,
          {
            '200': KoriZodSchema<typeof schema200>;
            '404': KoriZodSchema<typeof schema404>;
          }
        >
      >();
    });

    test('infers correct response schema type for content entries', () => {
      const schemaJson = z.object({ data: z.string() });
      const schemaXml = z.string();

      const responseSchema = zodResponseSchema({
        '200': {
          content: {
            'application/json': schemaJson,
            'application/xml': schemaXml,
          },
        },
      });

      expectTypeOf(responseSchema).toExtend<
        KoriResponseSchema<
          KoriZodSchemaProvider,
          {
            '200': KoriResponseSchemaContentEntry<
              KoriSchemaOf<KoriZodSchemaProvider>,
              {
                'application/json': KoriZodSchema<typeof schemaJson>;
                'application/xml': KoriZodSchema<typeof schemaXml>;
              }
            >;
          }
        >
      >();
    });
  });

  describe('complex schemas', () => {
    test('handles deeply nested schemas', () => {
      const complexSchema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string(),
            avatar: z.object({
              url: z.string(),
              size: z.number(),
            }),
          }),
          permissions: z.array(z.string()),
        }),
        metadata: z.record(z.string(), z.unknown()),
      });

      const responseSchema = zodResponseSchema({
        '200': complexSchema,
      });

      expect(responseSchema.provider).toBe(ZOD_SCHEMA_PROVIDER);
      expect(responseSchema.responses?.['200']).toEqual(createKoriZodSchema(complexSchema));
    });

    test('handles union and intersection types', () => {
      const unionSchema = z.union([
        z.object({ type: z.literal('success'), data: z.string() }),
        z.object({ type: z.literal('error'), error: z.string() }),
      ]);

      const responseSchema = zodResponseSchema({
        '200': unionSchema,
      });

      expect(responseSchema.provider).toBe(ZOD_SCHEMA_PROVIDER);
      expect(responseSchema.responses?.['200']).toEqual(createKoriZodSchema(unionSchema));
    });
  });
});

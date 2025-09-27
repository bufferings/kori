import {
  type KoriResponseSchema,
  type KoriResponseSchemaContentEntry,
  type KoriResponseSchemaContentEntryItem,
  type KoriResponseSchemaSimpleEntry,
  type KoriSchemaOf,
} from '@korix/kori';
import { describe, expect, test, expectTypeOf } from 'vitest';
import { z } from 'zod';

import { stdResponseSchema } from '../../src/std-response-schema/index.js';
import {
  STANDARD_SCHEMA_PROVIDER,
  createKoriStdSchema,
  type KoriStdSchema,
  type KoriStdSchemaProvider,
} from '../../src/std-schema/index.js';

describe('stdResponseSchema', () => {
  describe('simple schema responses', () => {
    test('creates response schema with direct Standard Schema schema', () => {
      const stringSchema = z.string();
      const responseSchema = stdResponseSchema({
        '200': stringSchema,
      });

      expect(responseSchema.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect(responseSchema.responses).toHaveProperty('200');
      expect(responseSchema.responses?.['200']).toEqual(createKoriStdSchema(stringSchema));
    });

    test('handles multiple status codes', () => {
      const responseSchema = stdResponseSchema({
        '200': z.object({ message: z.string() }),
        '400': z.object({ error: z.string() }),
        '500': z.object({ error: z.string(), details: z.string().optional() }),
      });

      expect(responseSchema.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect(responseSchema.responses).toHaveProperty('200');
      expect(responseSchema.responses).toHaveProperty('400');
      expect(responseSchema.responses).toHaveProperty('500');
    });

    test('creates response schema with schema wrapper object', () => {
      const schema = z.object({ id: z.string() });
      const responseSchema = stdResponseSchema({
        '201': {
          schema,
          description: 'Created successfully',
          examples: { example1: { id: 'test-id' } },
          links: { self: '/api/items/{id}' },
        },
      });

      expect(responseSchema.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      const entry = responseSchema.responses?.['201'];

      expect(entry).toMatchObject({
        schema: createKoriStdSchema(schema),
        description: 'Created successfully',
        examples: { example1: { id: 'test-id' } },
        links: { self: '/api/items/{id}' },
      });
    });

    test('handles response headers', () => {
      const bodySchema = z.object({ message: z.string() });
      const headerSchema = z.object({ 'x-rate-limit': z.string() });

      const responseSchema = stdResponseSchema({
        '200': {
          schema: bodySchema,
          headers: headerSchema,
          description: 'Success with rate limit headers',
        },
      });

      expect(responseSchema.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      const entry = responseSchema.responses?.['200'];

      expect(entry).toMatchObject({
        schema: createKoriStdSchema(bodySchema),
        headers: createKoriStdSchema(headerSchema),
        description: 'Success with rate limit headers',
      });
    });

    test('handles minimal schema wrapper with only required fields', () => {
      const schema = z.object({ result: z.string() });
      const responseSchema = stdResponseSchema({
        '200': {
          schema,
        },
      });

      expect(responseSchema.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      const entry = responseSchema.responses?.['200'];

      expect(entry).toMatchObject({
        schema: createKoriStdSchema(schema),
        description: undefined,
        headers: undefined,
        examples: undefined,
        links: undefined,
      });
    });

    test('handles partial metadata in schema wrapper', () => {
      const schema = z.object({ data: z.string() });
      const responseSchema = stdResponseSchema({
        '200': {
          schema,
          description: 'Only description',
        },
        '201': {
          schema,
          examples: { sample: { data: 'test' } },
        },
        '202': {
          schema,
          links: { next: '/api/next' },
        },
      });

      expect(responseSchema.provider).toBe(STANDARD_SCHEMA_PROVIDER);

      // Check each partial configuration
      expect(responseSchema.responses?.['200']).toMatchObject({
        schema: createKoriStdSchema(schema),
        description: 'Only description',
        headers: undefined,
        examples: undefined,
        links: undefined,
      });

      expect(responseSchema.responses?.['201']).toMatchObject({
        schema: createKoriStdSchema(schema),
        description: undefined,
        headers: undefined,
        examples: { sample: { data: 'test' } },
        links: undefined,
      });

      expect(responseSchema.responses?.['202']).toMatchObject({
        schema: createKoriStdSchema(schema),
        description: undefined,
        headers: undefined,
        examples: undefined,
        links: { next: '/api/next' },
      });
    });
  });

  describe('content-based responses', () => {
    test('creates response schema with content mapping', () => {
      const jsonSchema = z.object({ data: z.string() });
      const xmlSchema = z.string();

      const responseSchema = stdResponseSchema({
        '200': {
          content: {
            'application/json': jsonSchema,
            'application/xml': xmlSchema,
          },
          description: 'Multi-format response',
        },
      });

      expect(responseSchema.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      const entry = responseSchema.responses?.['200'];

      expect(entry).toMatchObject({
        description: 'Multi-format response',
        content: {
          'application/json': createKoriStdSchema(jsonSchema),
          'application/xml': createKoriStdSchema(xmlSchema),
        },
      });
    });

    test('handles content entries with examples', () => {
      const schema = z.object({ message: z.string() });

      const responseSchema = stdResponseSchema({
        200: {
          content: {
            'application/json': {
              schema,
              examples: { success: { message: 'Operation completed' } },
            },
          },
        },
      });

      expect(responseSchema.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      const entry = responseSchema.responses?.['200'];

      expect(entry).toMatchObject({
        content: {
          'application/json': {
            schema: createKoriStdSchema(schema),
            examples: { success: { message: 'Operation completed' } },
          },
        },
      });
    });

    test('handles content entries with headers and links', () => {
      const bodySchema = z.object({ id: z.string() });
      const headerSchema = z.object({ location: z.string() });

      const responseSchema = stdResponseSchema({
        '201': {
          description: 'Resource created',
          headers: headerSchema,
          content: {
            'application/json': bodySchema,
          },
          links: { self: '/api/resources/{id}' },
        },
      });

      expect(responseSchema.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      const entry = responseSchema.responses?.['201'];

      expect(entry).toMatchObject({
        description: 'Resource created',
        headers: createKoriStdSchema(headerSchema),
        content: {
          'application/json': createKoriStdSchema(bodySchema),
        },
        links: { self: '/api/resources/{id}' },
      });
    });

    test('handles content wrapper with headers and examples', () => {
      const jsonBodySchema = z.object({ id: z.string(), name: z.string() });
      const headerSchema = z.object({
        'x-rate-limit': z.string(),
        'x-rate-limit-remaining': z.string(),
      });
      const xmlBodySchema = z.string();

      const responseSchema = stdResponseSchema({
        '200': {
          description: 'Success with headers',
          headers: headerSchema,
          content: {
            'application/json': {
              schema: jsonBodySchema,
              examples: {
                user: { id: 'usr123', name: 'Alice' },
                admin: { id: 'adm456', name: 'Bob' },
              },
            },
            'application/xml': {
              schema: xmlBodySchema,
              examples: {
                sample: '<user><id>usr123</id><name>Alice</name></user>',
              },
            },
          },
        },
      });

      expect(responseSchema.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      const entry = responseSchema.responses?.['200'];

      expect(entry).toMatchObject({
        description: 'Success with headers',
        headers: createKoriStdSchema(headerSchema),
        content: {
          'application/json': {
            schema: createKoriStdSchema(jsonBodySchema),
            examples: {
              user: { id: 'usr123', name: 'Alice' },
              admin: { id: 'adm456', name: 'Bob' },
            },
          },
          'application/xml': {
            schema: createKoriStdSchema(xmlBodySchema),
            examples: {
              sample: '<user><id>usr123</id><name>Alice</name></user>',
            },
          },
        },
      });
    });
  });

  describe('mixed response formats', () => {
    test('handles combination of different entry formats', () => {
      const responseSchema = stdResponseSchema({
        '200': z.object({ success: z.boolean() }),
        '201': {
          schema: z.object({ id: z.string() }),
          description: 'Created',
        },
        '400': {
          content: {
            'application/json': z.object({ error: z.string() }),
            'text/plain': z.string(),
          },
        },
      });

      expect(responseSchema.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect(responseSchema.responses).toHaveProperty('200');
      expect(responseSchema.responses).toHaveProperty('201');
      expect(responseSchema.responses).toHaveProperty('400');

      // 200: Direct Standard Schema schema entry check
      const entry200 = responseSchema.responses?.['200'];
      expect(entry200).toMatchObject({
        koriKind: 'kori-schema',
        provider: STANDARD_SCHEMA_PROVIDER,
      });
      expect((entry200 as any)?.definition?.def?.type).toBe('object');

      // 201: Schema wrapper entry check
      const entry201 = responseSchema.responses?.['201'];
      expect(entry201).toMatchObject({
        description: 'Created',
        headers: undefined,
        examples: undefined,
        links: undefined,
      });
      expect((entry201 as any)?.schema?.koriKind).toBe('kori-schema');
      expect((entry201 as any)?.schema?.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect((entry201 as any)?.schema?.definition?.def?.type).toBe('object');

      // 400: Content-based entry check
      const entry400 = responseSchema.responses?.['400'];
      expect(entry400).toMatchObject({
        description: undefined,
        headers: undefined,
        links: undefined,
      });
      expect((entry400 as any)?.content?.['application/json']?.koriKind).toBe('kori-schema');
      expect((entry400 as any)?.content?.['application/json']?.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect((entry400 as any)?.content?.['text/plain']?.koriKind).toBe('kori-schema');
      expect((entry400 as any)?.content?.['text/plain']?.provider).toBe(STANDARD_SCHEMA_PROVIDER);
    });
  });

  describe('status code handling', () => {
    test('handles wildcard and default status codes', () => {
      const dataSchema = z.object({ data: z.string() });
      const clientErrorSchema = z.object({ error: z.string(), code: z.number() });
      const serverErrorSchema = z.object({ error: z.string(), stack: z.string().optional() });
      const defaultSchema = z.object({ message: z.string() });

      const responseSchema = stdResponseSchema({
        '200': dataSchema,
        '4XX': clientErrorSchema,
        '5XX': serverErrorSchema,
        default: defaultSchema,
      });

      expect(responseSchema.provider).toBe(STANDARD_SCHEMA_PROVIDER);

      expect(responseSchema.responses?.['200']).toEqual(createKoriStdSchema(dataSchema));
      expect(responseSchema.responses?.['4XX']).toEqual(createKoriStdSchema(clientErrorSchema));
      expect(responseSchema.responses?.['5XX']).toEqual(createKoriStdSchema(serverErrorSchema));
      expect(responseSchema.responses?.default).toEqual(createKoriStdSchema(defaultSchema));
    });

    test('handles numeric and string status codes consistently', () => {
      const stringSchema = z.object({ data: z.string() });
      const idSchema = z.object({ id: z.string() });

      const responseSchema = stdResponseSchema({
        200: stringSchema,
        '201': stringSchema,
        202: idSchema,
        '203': idSchema,
      });

      expect(responseSchema.provider).toBe(STANDARD_SCHEMA_PROVIDER);

      // Verify both numeric and string keys are normalized to strings with correct schemas
      expect(responseSchema.responses?.['200']).toEqual(createKoriStdSchema(stringSchema));
      expect(responseSchema.responses?.['201']).toEqual(createKoriStdSchema(stringSchema));
      expect(responseSchema.responses?.['202']).toEqual(createKoriStdSchema(idSchema));
      expect(responseSchema.responses?.['203']).toEqual(createKoriStdSchema(idSchema));
    });
  });

  describe('edge cases', () => {
    test('handles empty responses object', () => {
      const responseSchema = stdResponseSchema({});

      expect(responseSchema.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect(responseSchema.responses).toEqual({});
    });

    test('skips undefined entries', () => {
      const stringSchema = z.string();
      const responses = {
        '200': stringSchema,
        '201': undefined,
      };

      const responseSchema = stdResponseSchema(responses);

      expect(responseSchema.responses?.['200']).toEqual(createKoriStdSchema(stringSchema));
      expect(responseSchema.responses).not.toHaveProperty('201');
    });

    test('handles empty content object', () => {
      const responseSchema = stdResponseSchema({
        '204': {
          description: 'No Content',
          content: {},
        },
      });

      expect(responseSchema.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect(responseSchema.responses?.['204']).toMatchObject({
        description: 'No Content',
        content: {},
        headers: undefined,
        links: undefined,
      });
    });

    test('handles empty metadata objects', () => {
      const schema = z.string();
      const responseSchema = stdResponseSchema({
        '200': {
          schema,
          examples: {},
          links: {},
        },
      });

      expect(responseSchema.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect(responseSchema.responses?.['200']).toMatchObject({
        description: undefined,
        headers: undefined,
        schema: createKoriStdSchema(schema),
        examples: {},
        links: {},
      });
    });

    test('handles minimal content entry', () => {
      const stringSchema = z.string();
      const responseSchema = stdResponseSchema({
        '204': {
          content: {
            'text/plain': stringSchema,
          },
        },
      });

      expect(responseSchema.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect(responseSchema.responses?.['204']).toEqual({
        description: undefined,
        headers: undefined,
        content: {
          'text/plain': createKoriStdSchema(stringSchema),
        },
        links: undefined,
      });
    });
  });

  describe('type contracts', () => {
    test('infers correct response schema type for simple entries', () => {
      const schema200 = z.object({ message: z.string() });
      const schema404 = z.object({ error: z.string() });
      const responseSchema = stdResponseSchema({
        '200': schema200,
        '404': schema404,
      });

      expectTypeOf(responseSchema).toExtend<
        KoriResponseSchema<
          KoriStdSchemaProvider,
          {
            '200': KoriResponseSchemaSimpleEntry<KoriSchemaOf<KoriStdSchemaProvider>, KoriStdSchema<typeof schema200>>;
            '404': KoriResponseSchemaSimpleEntry<KoriSchemaOf<KoriStdSchemaProvider>, KoriStdSchema<typeof schema404>>;
          }
        >
      >();
    });

    test('infers correct response schema type for wrapper entries', () => {
      const schema = z.object({ id: z.string() });
      const responseSchema = stdResponseSchema({
        '201': {
          schema: schema,
          description: 'Created',
        },
      });

      expectTypeOf(responseSchema).toExtend<
        KoriResponseSchema<
          KoriStdSchemaProvider,
          {
            '201': KoriResponseSchemaSimpleEntry<KoriSchemaOf<KoriStdSchemaProvider>, KoriStdSchema<typeof schema>>;
          }
        >
      >();
    });

    test('infers correct response schema type for content entries', () => {
      const schemaJson = z.object({ data: z.string() });
      const schemaXml = z.string();

      const responseSchema = stdResponseSchema({
        '200': {
          content: {
            'application/json': schemaJson,
            'application/xml': schemaXml,
          },
        },
      });

      expectTypeOf(responseSchema).toExtend<
        KoriResponseSchema<
          KoriStdSchemaProvider,
          {
            '200': KoriResponseSchemaContentEntry<
              KoriSchemaOf<KoriStdSchemaProvider>,
              {
                'application/json': KoriResponseSchemaContentEntryItem<KoriStdSchema<typeof schemaJson>>;
                'application/xml': KoriResponseSchemaContentEntryItem<KoriStdSchema<typeof schemaXml>>;
              }
            >;
          }
        >
      >();
    });

    test('infers correct response schema type for wrapped content entries', () => {
      const schemaJson = z.object({ data: z.string() });

      const responseSchema = stdResponseSchema({
        '200': {
          content: {
            'application/json': {
              schema: schemaJson,
              examples: {
                sample: { data: 'test' },
              },
            },
          },
        },
      });

      expectTypeOf(responseSchema).toExtend<
        KoriResponseSchema<
          KoriStdSchemaProvider,
          {
            '200': KoriResponseSchemaContentEntry<
              KoriSchemaOf<KoriStdSchemaProvider>,
              {
                'application/json': KoriResponseSchemaContentEntryItem<KoriStdSchema<typeof schemaJson>>;
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

      const responseSchema = stdResponseSchema({
        '200': complexSchema,
      });

      expect(responseSchema.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect(responseSchema.responses?.['200']).toEqual(createKoriStdSchema(complexSchema));
    });

    test('handles union and intersection types', () => {
      const unionSchema = z.union([
        z.object({ type: z.literal('success'), data: z.string() }),
        z.object({ type: z.literal('error'), error: z.string() }),
      ]);

      const responseSchema = stdResponseSchema({
        '200': unionSchema,
      });

      expect(responseSchema.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect(responseSchema.responses?.['200']).toEqual(createKoriStdSchema(unionSchema));
    });
  });
});

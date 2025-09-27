import { createKoriSchema, type InferSchemaOutput } from '@korix/kori';
import { describe, test, expect, expectTypeOf } from 'vitest';
import { z } from 'zod';

import {
  STANDARD_SCHEMA_PROVIDER,
  type KoriStdSchemaBase,
  createKoriStdSchema,
  isKoriStdSchema,
} from '../../src/std-schema/index.js';

describe('std schema', () => {
  describe('createKoriStdSchema', () => {
    test('creates schema with correct provider', () => {
      const stdSchema = z.object({
        user: z.object({ id: z.string(), name: z.string() }),
        metadata: z.record(z.string(), z.string()),
        tags: z.array(z.string()).optional(),
      });
      const koriSchema = createKoriStdSchema(stdSchema);

      expect(koriSchema.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect(koriSchema.definition).toBe(stdSchema);
      expectTypeOf<InferSchemaOutput<typeof koriSchema>>().toEqualTypeOf<{
        user: { id: string; name: string };
        metadata: Record<string, string>;
        tags?: string[];
      }>();

      expect(isKoriStdSchema(koriSchema)).toBe(true);
    });
  });

  describe('isKoriStdSchema', () => {
    test('returns false for non-Kori schema', () => {
      expect(isKoriStdSchema(null)).toBe(false);
      expect(isKoriStdSchema(undefined)).toBe(false);
      expect(isKoriStdSchema({})).toBe(false);
      expect(isKoriStdSchema('string')).toBe(false);
      expect(isKoriStdSchema(z.string())).toBe(false);
    });

    test('returns false for non-Standard Schema Kori schema', () => {
      const nonZodSchema = createKoriSchema({
        provider: 'other',
        definition: 'some-definition',
      });

      expect(isKoriStdSchema(nonZodSchema)).toBe(false);
    });

    test('correctly narrows type when true', () => {
      const schema: unknown = createKoriStdSchema(z.string());

      if (isKoriStdSchema(schema)) {
        expectTypeOf(schema).toEqualTypeOf<KoriStdSchemaBase>();
        expect(schema.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      } else {
        expect.fail('schema is not a Kori Standard Schema');
      }
    });
  });
});

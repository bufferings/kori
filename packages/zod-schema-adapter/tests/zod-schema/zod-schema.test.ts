import { createKoriSchema, type InferSchemaOutput } from '@korix/kori';
import { describe, test, expect, expectTypeOf } from 'vitest';
import { z } from 'zod';

import {
  ZOD_SCHEMA_PROVIDER,
  type KoriZodSchemaBase,
  createKoriZodSchema,
  isKoriZodSchema,
} from '../../src/zod-schema/index.js';

describe('zod schema', () => {
  describe('createKoriZodSchema', () => {
    test('creates schema with correct provider', () => {
      const zodSchema = z.object({
        user: z.object({ id: z.string(), name: z.string() }),
        metadata: z.record(z.string(), z.string()),
        tags: z.array(z.string()).optional(),
      });
      const koriSchema = createKoriZodSchema(zodSchema);

      expect(koriSchema.provider).toBe(ZOD_SCHEMA_PROVIDER);
      expect(koriSchema.definition).toBe(zodSchema);
      expectTypeOf<InferSchemaOutput<typeof koriSchema>>().toEqualTypeOf<{
        user: { id: string; name: string };
        metadata: Record<string, string>;
        tags?: string[];
      }>();

      expect(isKoriZodSchema(koriSchema)).toBe(true);
    });
  });

  describe('isKoriZodSchema', () => {
    test('returns false for non-Kori schema', () => {
      expect(isKoriZodSchema(null)).toBe(false);
      expect(isKoriZodSchema(undefined)).toBe(false);
      expect(isKoriZodSchema({})).toBe(false);
      expect(isKoriZodSchema('string')).toBe(false);
      expect(isKoriZodSchema(z.string())).toBe(false);
    });

    test('returns false for non-Zod Kori schema', () => {
      const nonZodSchema = createKoriSchema({
        provider: 'other',
        definition: 'some-definition',
      });

      expect(isKoriZodSchema(nonZodSchema)).toBe(false);
    });

    test('correctly narrows type when true', () => {
      const schema: unknown = createKoriZodSchema(z.string());

      if (isKoriZodSchema(schema)) {
        expectTypeOf(schema).toEqualTypeOf<KoriZodSchemaBase>();
        expect(schema.provider).toBe(ZOD_SCHEMA_PROVIDER);
      } else {
        expect.fail('schema is not a Kori Zod schema');
      }
    });
  });
});

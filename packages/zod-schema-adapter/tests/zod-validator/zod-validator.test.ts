import { createKoriSchema } from '@korix/kori';
import { describe, test, expect, expectTypeOf } from 'vitest';
import { z } from 'zod';

import { createKoriZodSchema, ZOD_SCHEMA_PROVIDER } from '../../src/zod-schema/index.js';
import { createKoriZodValidator, type KoriZodValidator } from '../../src/zod-validator/index.js';

describe('createKoriZodValidator', () => {
  test('creates validator with correct provider', () => {
    const validator = createKoriZodValidator();
    expect(validator.provider).toBe(ZOD_SCHEMA_PROVIDER);
    expectTypeOf(validator).toMatchTypeOf<KoriZodValidator>();
  });

  describe('validation success', () => {
    test('validates primitive types', async () => {
      const validator = createKoriZodValidator();

      // string
      const stringSchema = createKoriZodSchema(z.string());
      const stringResult = await validator.validate({ schema: stringSchema, value: 'hello' });
      expect(stringResult.success).toBe(true);
      if (stringResult.success) {
        expect(stringResult.value).toBe('hello');
      }

      // number
      const numberSchema = createKoriZodSchema(z.number());
      const numberResult = await validator.validate({ schema: numberSchema, value: 42 });
      expect(numberResult.success).toBe(true);
      if (numberResult.success) {
        expect(numberResult.value).toBe(42);
      }

      // boolean
      const booleanSchema = createKoriZodSchema(z.boolean());
      const booleanResult = await validator.validate({ schema: booleanSchema, value: true });
      expect(booleanResult.success).toBe(true);
      if (booleanResult.success) {
        expect(booleanResult.value).toBe(true);
      }
    });

    test('validates complex types', async () => {
      const validator = createKoriZodValidator();
      const schema = createKoriZodSchema(
        z.object({
          name: z.string(),
          age: z.number(),
          tags: z.array(z.string()),
          metadata: z.record(z.string(), z.unknown()).optional(),
        }),
      );

      const value = {
        name: 'John',
        age: 30,
        tags: ['developer', 'typescript'],
      };

      const result = await validator.validate({ schema, value });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(value);
      }
    });

    test('applies Zod transformations', async () => {
      const validator = createKoriZodValidator();
      const schema = createKoriZodSchema(
        z.object({
          email: z.string().toLowerCase().trim(),
          age: z.string().transform((s) => parseInt(s, 10)),
        }),
      );

      const result = await validator.validate({
        schema,
        value: { email: '  USER@EXAMPLE.COM  ', age: '25' },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({
          email: 'user@example.com',
          age: 25,
        });
      }
    });
  });

  describe('validation failure - Zod errors', () => {
    test('fails with type mismatch', async () => {
      const validator = createKoriZodValidator();
      const schema = createKoriZodSchema(z.string());
      const result = await validator.validate({ schema, value: 42 });

      expect(result.success).toBe(false);
      if (result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason.provider).toBe(ZOD_SCHEMA_PROVIDER);
      expect(result.reason.type).toBe('Zod');
      if (result.reason.type !== 'Zod') {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason.message).toBe('Validation error');

      expect(result.reason.issues).toHaveLength(1);
      expect(result.reason.issues[0]?.code).toBe('invalid_type');
    });

    test('fails with missing required fields', async () => {
      const validator = createKoriZodValidator();
      const schema = createKoriZodSchema(
        z.object({
          required: z.string(),
          optional: z.string().optional(),
        }),
      );

      const result = await validator.validate({ schema, value: { optional: 'test' } });

      expect(result.success).toBe(false);
      if (result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason.provider).toBe(ZOD_SCHEMA_PROVIDER);
      expect(result.reason.type).toBe('Zod');
      if (result.reason.type !== 'Zod') {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason.issues).toHaveLength(1);
      expect(result.reason.issues[0]).toMatchObject({
        path: ['required'],
        code: 'invalid_type',
      });
    });

    test('collects multiple validation errors', async () => {
      const validator = createKoriZodValidator();
      const schema = createKoriZodSchema(
        z.object({
          email: z.string().email(),
          age: z.number().min(18).max(100),
        }),
      );

      const result = await validator.validate({
        schema,
        value: { email: 'not-an-email', age: 150 },
      });

      expect(result.success).toBe(false);
      if (result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason.provider).toBe(ZOD_SCHEMA_PROVIDER);
      expect(result.reason.type).toBe('Zod');
      if (result.reason.type !== 'Zod') {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason.issues).toHaveLength(2);
      const codes = result.reason.issues.map((issue) => issue.code);
      // Email validation returns 'invalid_string' in newer Zod versions
      expect(codes.some((code: any) => code === 'invalid_string' || code === 'invalid_format')).toBe(true);
      expect(codes).toContain('too_big');
    });
  });

  describe('validation failure - General errors', () => {
    test('fails for non-Zod schema', async () => {
      const validator = createKoriZodValidator();
      const nonZodSchema = createKoriSchema({
        provider: 'other-provider',
        definition: {},
      });

      const result = await validator.validate({
        schema: nonZodSchema as any,
        value: 'test',
      });

      expect(result.success).toBe(false);
      if (result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason.provider).toBe(ZOD_SCHEMA_PROVIDER);
      expect(result.reason.type).toBe('General');
      if (result.reason.type !== 'General') {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason.message).toBe('Validation error');
      expect(result.reason.detail).toBe('Schema is not a Kori Zod schema');
    });

    test('handles Error exceptions during validation', async () => {
      const validator = createKoriZodValidator();
      const schema = createKoriZodSchema(z.string());
      const brokenSchema = {
        ...schema,
        definition: {
          safeParse: () => {
            throw new Error('Unexpected error');
          },
        },
      };

      const result = await validator.validate({
        schema: brokenSchema as any,
        value: 'test',
      });

      expect(result.success).toBe(false);
      if (result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason.provider).toBe(ZOD_SCHEMA_PROVIDER);
      expect(result.reason.type).toBe('General');
      if (result.reason.type !== 'General') {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason.message).toBe('An error occurred during validation');
      expect(result.reason.detail).toBe('Unexpected error');
    });

    test('handles non-Error exceptions during validation', async () => {
      const validator = createKoriZodValidator();
      const schema = createKoriZodSchema(z.string());
      const brokenSchema = {
        ...schema,
        definition: {
          safeParse: () => {
            throw new Error('String exception');
          },
        },
      };

      const result = await validator.validate({
        schema: brokenSchema as any,
        value: 'test',
      });

      expect(result.success).toBe(false);
      if (result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason.provider).toBe(ZOD_SCHEMA_PROVIDER);
      expect(result.reason.type).toBe('General');
      if (result.reason.type !== 'General') {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason.message).toBe('An error occurred during validation');
      expect(result.reason.detail).toBe('String exception');
    });
  });
});

import { createKoriSchema } from '@korix/kori';
import { describe, test, expect, expectTypeOf } from 'vitest';
import { z } from 'zod';

import { createKoriStdSchema, STANDARD_SCHEMA_PROVIDER } from '../../src/std-schema/index.js';
import { createKoriStdValidator, type KoriStdValidator } from '../../src/std-validator/index.js';

describe('createKoriStdValidator', () => {
  test('creates validator with correct provider', () => {
    const validator = createKoriStdValidator();
    expect(validator.provider).toBe(STANDARD_SCHEMA_PROVIDER);
    expectTypeOf(validator).toExtend<KoriStdValidator>();
  });

  describe('validation success', () => {
    test('validates primitive types', async () => {
      const validator = createKoriStdValidator();

      // string
      const stringSchema = createKoriStdSchema(z.string());
      const stringResult = await validator.validate({ schema: stringSchema, value: 'hello' });
      expect(stringResult.success).toBe(true);
      if (stringResult.success) {
        expect(stringResult.value).toBe('hello');
      }

      // number
      const numberSchema = createKoriStdSchema(z.number());
      const numberResult = await validator.validate({ schema: numberSchema, value: 42 });
      expect(numberResult.success).toBe(true);
      if (numberResult.success) {
        expect(numberResult.value).toBe(42);
      }

      // boolean
      const booleanSchema = createKoriStdSchema(z.boolean());
      const booleanResult = await validator.validate({ schema: booleanSchema, value: true });
      expect(booleanResult.success).toBe(true);
      if (booleanResult.success) {
        expect(booleanResult.value).toBe(true);
      }
    });

    test('validates complex types', async () => {
      const validator = createKoriStdValidator();
      const schema = createKoriStdSchema(
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

    test('applies Standard Schema transformations', async () => {
      const validator = createKoriStdValidator();
      const schema = createKoriStdSchema(
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

  describe('validation failure - Standard Schema errors', () => {
    test('fails with type mismatch', async () => {
      const validator = createKoriStdValidator();
      const schema = createKoriStdSchema(z.string());
      const result = await validator.validate({ schema, value: 42 });

      expect(result.success).toBe(false);
      if (result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect(result.reason.type).toBe('Validation');
      if (result.reason.type !== 'Validation') {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason.message).toBe('Validation error');

      expect(result.reason.issues).toHaveLength(1);
      expect(result.reason.issues[0]).toMatchObject({
        path: [],
        message: 'Invalid input: expected string, received number',
      });
    });

    test('fails with missing required fields', async () => {
      const validator = createKoriStdValidator();
      const schema = createKoriStdSchema(
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

      expect(result.reason.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect(result.reason.type).toBe('Validation');
      if (result.reason.type !== 'Validation') {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason.issues).toHaveLength(1);
      expect(result.reason.issues[0]).toMatchObject({
        path: ['required'],
        message: 'Invalid input: expected string, received undefined',
      });
    });

    test('collects multiple validation errors', async () => {
      const validator = createKoriStdValidator();
      const schema = createKoriStdSchema(
        z.object({
          email: z.email(),
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

      expect(result.reason.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect(result.reason.type).toBe('Validation');
      if (result.reason.type !== 'Validation') {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason.issues).toHaveLength(2);
      expect(result.reason.issues[0]).toMatchObject({
        path: ['email'],
        message: 'Invalid email address',
      });
      expect(result.reason.issues[1]).toMatchObject({
        path: ['age'],
        message: 'Too big: expected number to be <=100',
      });
    });
  });

  describe('validation failure - General errors', () => {
    test('fails for non-Standard Schema schema', async () => {
      const validator = createKoriStdValidator();
      const nonStdSchema = createKoriSchema({
        provider: 'other-provider',
        definition: {},
      });

      const result = await validator.validate({
        schema: nonStdSchema as any,
        value: 'test',
      });

      expect(result.success).toBe(false);
      if (result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect(result.reason.type).toBe('General');
      if (result.reason.type !== 'General') {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason.message).toBe('Validation error');
      expect(result.reason.detail).toBe('Schema is not a Kori Standard Schema');
    });

    test('handles Error exceptions during validation', async () => {
      const validator = createKoriStdValidator();
      const schema = createKoriStdSchema(z.string());
      const brokenSchema = {
        ...schema,
        definition: {
          ['~standard']: {
            validate: () => {
              throw new Error('Unexpected error');
            },
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

      expect(result.reason.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect(result.reason.type).toBe('General');
      if (result.reason.type !== 'General') {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason.message).toBe('An error occurred during validation');
      expect(result.reason.detail).toBe('Unexpected error');
    });

    test('handles non-Error exceptions during validation', async () => {
      const validator = createKoriStdValidator();
      const schema = createKoriStdSchema(z.string());
      const brokenSchema = {
        ...schema,
        definition: {
          ['~standard']: {
            validate: () => {
              // eslint-disable-next-line @typescript-eslint/only-throw-error
              throw 'String exception';
            },
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

      expect(result.reason.provider).toBe(STANDARD_SCHEMA_PROVIDER);
      expect(result.reason.type).toBe('General');
      if (result.reason.type !== 'General') {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason.message).toBe('An error occurred during validation');
      expect(result.reason.detail).toBe('String exception');
    });
  });
});

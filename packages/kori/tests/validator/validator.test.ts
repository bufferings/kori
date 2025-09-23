import { describe, expect, expectTypeOf, test } from 'vitest';

import { type KoriResult } from '../../src/index.js';

import {
  createKoriSchema,
  type InferSchemaOutput,
  type KoriSchema,
  type KoriSchemaOf,
} from '../../src/schema/schema.js';
import {
  createKoriValidator,
  isKoriValidator,
  type InferValidatorFailureReason,
  type InferValidatorProvider,
} from '../../src/validator/validator.js';

const myProvider = 'my-validator';

type MyProvider = typeof myProvider;

type MyFailureReason = { message: string };

type MySchemaDef = {
  safeParse: (value: unknown) => KoriResult<string, MyFailureReason>;
};

type MySchema = KoriSchema<MyProvider, MySchemaDef, string>;

const mySchema: MySchema = createKoriSchema<MyProvider, MySchemaDef, string>({
  provider: myProvider,
  definition: {
    safeParse: (value: unknown) =>
      typeof value === 'string' ? { success: true, value } : { success: false, reason: { message: 'not-a-string' } },
  },
});

const myValidator = createKoriValidator<MyProvider, MyFailureReason>({
  provider: myProvider,
  validate: <S extends KoriSchemaOf<MyProvider>>({ schema, value }: { schema: S; value: unknown }) =>
    (schema.definition as MySchemaDef).safeParse(value) as KoriResult<InferSchemaOutput<S>, MyFailureReason>,
});

describe('KoriValidator', () => {
  test('createKoriValidator returns KoriValidator', () => {
    expect(myValidator.koriKind).toBe('kori-validator');
    expect(myValidator.provider).toBe(myProvider);
    expect(typeof myValidator.validate).toBe('function');
    expect(isKoriValidator(myValidator)).toBe(true);
  });

  test('isKoriValidator identifies KoriValidator objects', () => {
    expect(isKoriValidator(null)).toBe(false);
    expect(isKoriValidator(undefined)).toBe(false);
    expect(isKoriValidator({})).toBe(false);
    expect(isKoriValidator({ koriKind: 'wrong-kind' })).toBe(false);

    expect(isKoriValidator({ koriKind: 'kori-validator' })).toBe(true);
  });

  test('KoriValidator preserves provider and failure reason types', () => {
    expectTypeOf<InferValidatorProvider<typeof myValidator>>().toEqualTypeOf<MyProvider>();
    expectTypeOf<InferValidatorFailureReason<typeof myValidator>>().toEqualTypeOf<MyFailureReason>();
  });

  test('validator validates with schema successfully', async () => {
    const result = await myValidator.validate({ schema: mySchema, value: 'hello' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe('hello');
    }
  });

  test('validator returns failure for invalid value', async () => {
    const result = await myValidator.validate({ schema: mySchema, value: 1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toStrictEqual({ message: 'not-a-string' });
    }
  });
});

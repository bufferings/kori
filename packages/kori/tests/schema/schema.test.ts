import { describe, expect, expectTypeOf, test } from 'vitest';

import { type InferSchemaOutput, type InferSchemaProvider } from '../../src/schema/infer.js';
import { createKoriSchema, getKoriSchemaProvider, isKoriSchema } from '../../src/schema/schema.js';

const TestBrand = Symbol('test-schema');

describe('KoriSchema', () => {
  test('createKoriSchema creates valid schemas', () => {
    const definition = { type: 'string', minLength: 1 };
    const schema = createKoriSchema({ provider: TestBrand, definition });

    expect(schema.definition).toBe(definition);
    expect(getKoriSchemaProvider(schema)).toBe(TestBrand);
    expect(isKoriSchema(schema)).toBe(true);
  });

  test('isKoriSchema rejects non-schema values', () => {
    expect(isKoriSchema(null)).toBe(false);
    expect(isKoriSchema({ definition: 'test', someOtherProp: 'value' })).toBe(false);
  });

  test('createKoriSchema preserves type information', () => {
    type TestDef = { type: 'string'; minLength: number };
    type TestOut = string;

    const schema = createKoriSchema<typeof TestBrand, TestDef, TestOut>({
      provider: TestBrand,
      definition: {
        type: 'string',
        minLength: 1,
      },
    });

    expectTypeOf(schema.definition).toEqualTypeOf<TestDef>();
    expectTypeOf<InferSchemaProvider<typeof schema>>().toEqualTypeOf<typeof TestBrand>();
    expectTypeOf<InferSchemaOutput<typeof schema>>().toEqualTypeOf<TestOut>();
  });
});

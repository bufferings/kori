import { describe, expect, expectTypeOf, test } from 'vitest';

import {
  createKoriSchema,
  isKoriSchema,
  type InferSchemaOutput,
  type InferSchemaProvider,
} from '../../src/schema/schema.js';

const testProvider = 'test-schema';

describe('KoriSchema', () => {
  test('createKoriSchema returns KoriSchema', () => {
    const definition = { type: 'string', minLength: 1 };
    const schema = createKoriSchema({ provider: testProvider, definition });

    expect(schema.koriKind).toBe('kori-schema');
    expect(schema.provider).toBe(testProvider);
    expect(schema.definition).toBe(definition);
    expect(isKoriSchema(schema)).toBe(true);
  });

  test('isKoriSchema identifies KoriSchema objects', () => {
    expect(isKoriSchema(null)).toBe(false);
    expect(isKoriSchema(undefined)).toBe(false);
    expect(isKoriSchema({})).toBe(false);
    expect(isKoriSchema({ definition: 'test', someOtherProp: 'value' })).toBe(false);
    expect(isKoriSchema({ koriKind: 'wrong-kind', provider: 'test' })).toBe(false);
    expect(isKoriSchema({ koriKind: 'kori-schema' })).toBe(true);
  });

  test('KoriSchema preserves provider and output types', () => {
    type TestDef = { type: 'string'; minLength: number };
    type TestOut = string;

    const schema = createKoriSchema<typeof testProvider, TestDef, TestOut>({
      provider: testProvider,
      definition: {
        type: 'string',
        minLength: 1,
      },
    });

    expectTypeOf(schema.definition).toEqualTypeOf<TestDef>();
    expectTypeOf<InferSchemaProvider<typeof schema>>().toEqualTypeOf<typeof testProvider>();
    expectTypeOf<InferSchemaOutput<typeof schema>>().toEqualTypeOf<TestOut>();
  });
});

import { describe, test, expect } from 'vitest';

import { type SchemaConverter } from '../../src/schema-converter/index.js';

import { composeConverters } from '../../src/generator/compose-converters.js';
import { createTestSchema } from '../test-helpers.js';

describe('composeConverters', () => {
  test('returns result from matching converter', () => {
    const converter: SchemaConverter = {
      name: 'test-converter',
      canConvert: ({ schema }) => schema.provider === 'test',
      convert: () => ({ type: 'string' }),
    };

    const convert = composeConverters([converter]);
    const schema = createTestSchema({ provider: 'test' });
    const result = convert({ schema });

    expect(result).toEqual({ type: 'string' });
  });

  test('tries converters in order and returns first match', () => {
    let converter1Called = false;
    let converter2Called = false;

    const converter1: SchemaConverter = {
      name: 'converter-1',
      canConvert: () => {
        converter1Called = true;
        return false;
      },
      convert: () => ({ type: 'string' }),
    };
    const converter2: SchemaConverter = {
      name: 'converter-2',
      canConvert: () => {
        converter2Called = true;
        return true;
      },
      convert: () => ({ type: 'number' }),
    };

    const convert = composeConverters([converter1, converter2]);
    const schema = createTestSchema();
    const result = convert({ schema });

    expect(converter1Called).toBe(true);
    expect(converter2Called).toBe(true);
    expect(result).toEqual({ type: 'number' });
  });

  test('stops at first matching converter without calling remaining converters', () => {
    let converter2CanConvertCalled = false;
    let converter2ConvertCalled = false;

    const converter1: SchemaConverter = {
      name: 'converter-1',
      canConvert: () => true,
      convert: () => ({ type: 'string' }),
    };
    const converter2: SchemaConverter = {
      name: 'converter-2',
      canConvert: () => {
        converter2CanConvertCalled = true;
        return true;
      },
      convert: () => {
        converter2ConvertCalled = true;
        return { type: 'number' };
      },
    };

    const convert = composeConverters([converter1, converter2]);
    const schema = createTestSchema();
    const result = convert({ schema });

    expect(result).toEqual({ type: 'string' });
    expect(converter2CanConvertCalled).toBe(false);
    expect(converter2ConvertCalled).toBe(false);
  });

  test('returns undefined when no converter matches', () => {
    const converter1: SchemaConverter = {
      name: 'converter-1',
      canConvert: () => false,
      convert: () => ({ type: 'string' }),
    };
    const converter2: SchemaConverter = {
      name: 'converter-2',
      canConvert: () => false,
      convert: () => ({ type: 'number' }),
    };

    const convert = composeConverters([converter1, converter2]);
    const schema = createTestSchema();
    const result = convert({ schema });

    expect(result).toBeUndefined();
  });

  test('returns undefined with empty converter array', () => {
    const convert = composeConverters([]);
    const schema = createTestSchema();
    const result = convert({ schema });

    expect(result).toBeUndefined();
  });
});

import { type } from 'arktype';
import * as v from 'valibot';
import { describe, test, expect } from 'vitest';
import { z } from 'zod';

import { isStdType } from '../../src/util/is-std-type.js';

describe('isStdType', () => {
  describe('actual validation packages', () => {
    test('zod schema is recognized as std type', () => {
      const schema = z.string();
      expect(isStdType(schema)).toBe(true);
    });

    test('valibot schema is recognized as std type', () => {
      const schema = v.object({
        name: v.string(),
        email: v.string(),
        age: v.number(),
      });
      expect(isStdType(schema)).toBe(true);
    });

    test('arktype schema is recognized as std type', () => {
      // ArkType schema is a function
      const schema = type({
        name: 'string',
        email: 'string',
        age: 'number',
      });
      expect(isStdType(schema)).toBe(true);
    });
  });

  describe('~standard property detection', () => {
    test('returns true for object with ~standard property', () => {
      const obj = { '~standard': true };
      expect(isStdType(obj)).toBe(true);
    });

    test('returns true for function with ~standard property', () => {
      function fn() {}
      (fn as any)['~standard'] = true;
      expect(isStdType(fn)).toBe(true);
    });

    test('returns true for primitive with ~standard property via Object wrapper', () => {
      const str = new String('abc');
      (str as any)['~standard'] = true;
      expect(isStdType(str)).toBe(true);

      const num = new Number(123);
      (num as any)['~standard'] = true;
      expect(isStdType(num)).toBe(true);

      const bool = new Boolean(false);
      (bool as any)['~standard'] = true;
      expect(isStdType(bool)).toBe(true);
    });
  });

  describe('returns false for non-std types', () => {
    test('plain object', () => {
      expect(isStdType({})).toBe(false);
    });

    test('primitive values', () => {
      expect(isStdType('string')).toBe(false);
    });

    test('null', () => {
      expect(isStdType(null)).toBe(false);
    });

    test('undefined', () => {
      expect(isStdType(undefined)).toBe(false);
    });
  });
});

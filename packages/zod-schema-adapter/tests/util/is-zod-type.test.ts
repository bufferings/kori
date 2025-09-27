import { describe, test, expect } from 'vitest';
import { z } from 'zod';

import { isZodType } from '../../src/util/is-zod-type.js';

describe('isZodType', () => {
  test('returns true for zod schema', () => {
    const schema = z.string();
    expect(isZodType(schema)).toBe(true);
  });

  test('returns false for plain object', () => {
    expect(isZodType({})).toBe(false);
  });

  test('returns false for primitive values', () => {
    expect(isZodType('string')).toBe(false);
  });

  test('returns false for null', () => {
    expect(isZodType(null)).toBe(false);
  });

  test('returns false for undefined', () => {
    expect(isZodType(undefined)).toBe(false);
  });
});

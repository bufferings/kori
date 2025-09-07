import { describe, test, expect } from 'vitest';

import { succeed, fail } from '../../src/util/result.js';

describe('Result utilities', () => {
  test('succeed() creates success result', () => {
    const result = succeed(42);

    expect(result.success).toBe(true);
    expect(result.value).toBe(42);
  });

  test('fail() creates failure result', () => {
    const result = fail('failed');

    expect(result.success).toBe(false);
    expect(result.reason).toBe('failed');
  });
});

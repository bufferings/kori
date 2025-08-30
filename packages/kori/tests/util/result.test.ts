import { describe, test, expect } from 'vitest';

import { ok, err } from '../../src/util/result.js';

describe('Result utilities', () => {
  test('ok() creates success result', () => {
    const result = ok(42);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(42);
  });

  test('err() creates error result', () => {
    const result = err('failed');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('failed');
  });
});

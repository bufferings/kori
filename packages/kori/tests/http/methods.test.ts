import { describe, expect, test } from 'vitest';

import { getMethodString } from '../../src/http/index.js';

describe('getMethodString', () => {
  test('should return string method as-is', () => {
    expect(getMethodString('GET')).toBe('GET');
  });

  test('should extract custom method string', () => {
    expect(getMethodString({ custom: 'SUBSCRIBE' })).toBe('SUBSCRIBE');
  });
});

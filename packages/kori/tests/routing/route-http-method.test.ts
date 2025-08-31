import { describe, expect, test } from 'vitest';

import { normalizeRouteHttpMethod } from '../../src/routing/route-http-method.js';

describe('normalizeRouteHttpMethod', () => {
  test('should return string method as-is', () => {
    expect(normalizeRouteHttpMethod('GET')).toBe('GET');
    expect(normalizeRouteHttpMethod('POST')).toBe('POST');
  });

  test('should extract custom method string', () => {
    expect(normalizeRouteHttpMethod({ custom: 'SUBSCRIBE' })).toBe('SUBSCRIBE');
    expect(normalizeRouteHttpMethod({ custom: 'PATCH' })).toBe('PATCH');
  });
});

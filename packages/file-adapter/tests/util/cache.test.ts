import { describe, test, expect } from 'vitest';

import { createCacheControl } from '../../src/util/cache.js';

describe('Cache-Control generation', () => {
  test('creates basic cache control with max-age', () => {
    const result = createCacheControl({ maxAge: 3600 });
    expect(result).toBe('public, max-age=3600');
  });

  test('includes immutable directive', () => {
    const result = createCacheControl({ maxAge: 31536000, immutable: true });
    expect(result).toBe('public, max-age=31536000, immutable');
  });

  test('includes must-revalidate directive', () => {
    const result = createCacheControl({ maxAge: 3600, mustRevalidate: true });
    expect(result).toBe('public, max-age=3600, must-revalidate');
  });

  test('creates private cache control', () => {
    const result = createCacheControl({ maxAge: 3600, public: false });
    expect(result).toBe('private, max-age=3600');
  });

  test('defaults to public when not specified', () => {
    const result = createCacheControl({ maxAge: 0 });
    expect(result).toBe('public, max-age=0');
  });

  test('handles zero max-age for ETag-only validation', () => {
    const result = createCacheControl({ maxAge: 0 });
    expect(result).toBe('public, max-age=0');
  });

  test('combines all directives correctly', () => {
    const result = createCacheControl({
      maxAge: 86400,
      immutable: true,
      mustRevalidate: true,
      public: true,
    });
    expect(result).toBe('public, max-age=86400, immutable, must-revalidate');
  });

  test('handles undefined max-age', () => {
    const result = createCacheControl({ immutable: true });
    expect(result).toBe('public, immutable');
  });

  test('creates minimal cache control with empty options', () => {
    const result = createCacheControl({});
    expect(result).toBe('public');
  });

  test('creates private cache control with must-revalidate', () => {
    const result = createCacheControl({
      public: false,
      mustRevalidate: true,
    });
    expect(result).toBe('private, must-revalidate');
  });
});
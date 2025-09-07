import { describe, expect, test } from 'vitest';

import { KoriCookieError, KoriError } from '../../src/error/index.js';

describe('KoriCookieError', () => {
  test('should wrap cookie error with proper message format', () => {
    const cookieFailure = {
      type: 'INVALID_NAME' as const,
      name: 'invalid name!',
      message: 'Invalid cookie name',
    };

    const error = new KoriCookieError(cookieFailure);

    expect(error.message).toBe('Cookie operation failed: Invalid cookie name');
    expect(error.name).toBe('KoriCookieError');
    expect(error.code).toBe('COOKIE_ERROR');
    expect(error.cookieFailure).toBe(cookieFailure);
  });

  test('should maintain proper inheritance chain', () => {
    const cookieFailure = {
      type: 'INVALID_NAME' as const,
      name: 'test',
      message: 'test error',
    };
    const error = new KoriCookieError(cookieFailure);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(KoriError);
  });
});

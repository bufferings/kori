import { describe, expect, test } from 'vitest';

import { KoriError, KoriSetCookieHeaderError } from '../../src/error/index.js';

describe('KoriSetCookieHeaderError', () => {
  test('should create error with predefined message and code', () => {
    const error = new KoriSetCookieHeaderError();

    expect(error.message).toBe('set-cookie must use setCookie/clearCookie');
    expect(error.name).toBe('KoriSetCookieHeaderError');
    expect(error.code).toBe('SET_COOKIE_HEADER_ERROR');
    expect(error.data).toBeUndefined();
    expect(error.cause).toBeUndefined();
  });

  test('should maintain proper inheritance chain', () => {
    const error = new KoriSetCookieHeaderError();

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(KoriError);
  });
});

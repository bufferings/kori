import { describe, expect, test } from 'vitest';

import { deleteCookie } from '../../src/http/cookies.js';

describe('deleteCookie', () => {
  test('should create cookie deletion string', () => {
    const result = deleteCookie('session_id');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('session_id=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    }
  });

  test('should include path and domain options', () => {
    const result = deleteCookie('session_id', { path: '/api', domain: 'example.com' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(
        'session_id=; Max-Age=0; Domain=example.com; Path=/api; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      );
    }
  });

  test('should validate cookie name in deleteCookie', () => {
    const valid1 = deleteCookie('validName');
    expect(valid1.ok).toBe(true);

    const valid2 = deleteCookie('valid_name-123');
    expect(valid2.ok).toBe(true);

    const invalid1 = deleteCookie('');
    expect(invalid1.ok).toBe(false);
    if (!invalid1.ok) {
      expect(invalid1.error.type).toBe('INVALID_NAME');
      expect(invalid1.error.message).toContain('Cookie name cannot be empty');
    }

    const invalid2 = deleteCookie('invalid name');
    expect(invalid2.ok).toBe(false);
    if (!invalid2.ok) {
      expect(invalid2.error.type).toBe('INVALID_NAME');
      expect(invalid2.error.message).toContain('RFC 6265 compliant');
    }

    const invalid3 = deleteCookie('invalid;name');
    expect(invalid3.ok).toBe(false);
    if (!invalid3.ok) {
      expect(invalid3.error.type).toBe('INVALID_NAME');
    }
  });
});

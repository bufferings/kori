import { describe, expect, test } from 'vitest';

import { deleteCookie } from '../../src/http/cookies.js';

describe('deleteCookie', () => {
  test('should create cookie deletion string', () => {
    const result = deleteCookie('session_id');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe('session_id=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    }
  });

  test('should include path and domain options', () => {
    const result = deleteCookie('session_id', { path: '/api', domain: 'example.com' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe(
        'session_id=; Max-Age=0; Domain=example.com; Path=/api; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      );
    }
  });

  test('should validate cookie name in deleteCookie', () => {
    const valid1 = deleteCookie('validName');
    expect(valid1.success).toBe(true);

    const valid2 = deleteCookie('valid_name-123');
    expect(valid2.success).toBe(true);

    const invalid1 = deleteCookie('');
    expect(invalid1.success).toBe(false);
    if (!invalid1.success) {
      expect(invalid1.reason.type).toBe('INVALID_NAME');
      expect(invalid1.reason.message).toContain('Cookie name cannot be empty');
    }

    const invalid2 = deleteCookie('invalid name');
    expect(invalid2.success).toBe(false);
    if (!invalid2.success) {
      expect(invalid2.reason.type).toBe('INVALID_NAME');
      expect(invalid2.reason.message).toContain('RFC 6265 compliant');
    }

    const invalid3 = deleteCookie('invalid;name');
    expect(invalid3.success).toBe(false);
    if (!invalid3.success) {
      expect(invalid3.reason.type).toBe('INVALID_NAME');
    }
  });
});

import { describe, expect, test } from 'vitest';

import { deleteCookie, parseCookies, serializeCookie } from '../../src/http/cookies.js';

describe('Cookie utilities', () => {
  describe('parseCookies', () => {
    test('should parse simple cookie', () => {
      const result = parseCookies('sessionId=abc123');
      expect(result).toEqual({ sessionId: 'abc123' });
    });

    test('should parse multiple cookies', () => {
      const result = parseCookies('sessionId=abc123; username=john; theme=dark');
      expect(result).toEqual({
        sessionId: 'abc123',
        username: 'john',
        theme: 'dark',
      });
    });

    test('should handle URL encoded values', () => {
      const result = parseCookies('message=hello%20world; name=john%40example.com');
      expect(result).toEqual({
        message: 'hello world',
        name: 'john@example.com',
      });
    });

    test('should handle empty cookie header', () => {
      expect(parseCookies('')).toEqual({});
      expect(parseCookies(undefined)).toEqual({});
    });

    test('should handle malformed cookies', () => {
      // Cookie without value
      const result1 = parseCookies('sessionId=; username=john');
      expect(result1).toEqual({ sessionId: '', username: 'john' });

      // Cookie without equals sign
      const result2 = parseCookies('sessionId; username=john');
      expect(result2).toEqual({ username: 'john' });

      // Extra spaces
      const result3 = parseCookies('  sessionId = abc123  ;  username = john  ');
      expect(result3).toEqual({ sessionId: 'abc123', username: 'john' });
    });

    test('should handle malformed URI encoding gracefully', () => {
      // Malformed percent encoding
      const result1 = parseCookies('sessionId=%ZZ; username=john');
      expect(result1).toEqual({ sessionId: '%ZZ', username: 'john' });

      // Incomplete percent encoding
      const result2 = parseCookies('data=%2; valid=test');
      expect(result2).toEqual({ data: '%2', valid: 'test' });

      // Invalid UTF-8 sequence
      const result3 = parseCookies('token=%C0%80; user=alice');
      expect(result3).toEqual({ token: '%C0%80', user: 'alice' });

      // Multiple malformed values should not affect parsing of valid ones
      const result4 = parseCookies('bad1=%ZZ; good=valid; bad2=%2; another=test');
      expect(result4).toEqual({ bad1: '%ZZ', good: 'valid', bad2: '%2', another: 'test' });
    });
  });

  describe('serializeCookie', () => {
    test('should serialize simple cookie', () => {
      const result = serializeCookie('sessionId', 'abc123');
      expect(result).toBe('sessionId=abc123');
    });

    test('should URL encode cookie value', () => {
      const result = serializeCookie('message', 'hello world');
      expect(result).toBe('message=hello%20world');
    });

    test('should include expires option', () => {
      // Use a date 24 hours from now to avoid hardcoded dates
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const result = serializeCookie('sessionId', 'abc123', { expires });
      expect(result).toBe(`sessionId=abc123; Expires=${expires.toUTCString()}`);
    });

    test('should include maxAge option', () => {
      const result = serializeCookie('sessionId', 'abc123', { maxAge: 3600 });
      expect(result).toBe('sessionId=abc123; Max-Age=3600');
    });

    test('should include domain option', () => {
      const result = serializeCookie('sessionId', 'abc123', { domain: 'example.com' });
      expect(result).toBe('sessionId=abc123; Domain=example.com');
    });

    test('should include path option', () => {
      const result = serializeCookie('sessionId', 'abc123', { path: '/api' });
      expect(result).toBe('sessionId=abc123; Path=/api');
    });

    test('should include secure flag', () => {
      const result = serializeCookie('sessionId', 'abc123', { secure: true });
      expect(result).toBe('sessionId=abc123; Secure');
    });

    test('should include httpOnly flag', () => {
      const result = serializeCookie('sessionId', 'abc123', { httpOnly: true });
      expect(result).toBe('sessionId=abc123; HttpOnly');
    });

    test('should include sameSite option', () => {
      const result1 = serializeCookie('sessionId', 'abc123', { sameSite: 'strict' });
      expect(result1).toBe('sessionId=abc123; SameSite=strict');

      const result2 = serializeCookie('sessionId', 'abc123', { sameSite: 'lax' });
      expect(result2).toBe('sessionId=abc123; SameSite=lax');

      const result3 = serializeCookie('sessionId', 'abc123', { sameSite: 'none' });
      expect(result3).toBe('sessionId=abc123; SameSite=none');
    });

    test('should include all options', () => {
      // Use a date 24 hours from now to avoid hardcoded dates
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const result = serializeCookie('sessionId', 'abc123', {
        expires,
        maxAge: 3600,
        domain: 'example.com',
        path: '/api',
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
      });
      expect(result).toBe(
        `sessionId=abc123; Expires=${expires.toUTCString()}; Max-Age=3600; Domain=example.com; Path=/api; Secure; HttpOnly; SameSite=strict`,
      );
    });

    test('should handle encoding errors gracefully', () => {
      // Most values should encode fine, but if encoding fails, use raw value
      const result1 = serializeCookie('sessionId', 'normal-value');
      expect(result1).toBe('sessionId=normal-value');

      const result2 = serializeCookie('data', 'value with spaces');
      expect(result2).toBe('data=value%20with%20spaces');
    });
  });

  describe('deleteCookie', () => {
    test('should create cookie deletion string', () => {
      const result = deleteCookie('sessionId');
      expect(result).toBe('sessionId=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0');
    });

    test('should include path and domain options', () => {
      const result = deleteCookie('sessionId', { path: '/api', domain: 'example.com' });
      expect(result).toBe(
        'sessionId=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Domain=example.com; Path=/api',
      );
    });
  });
});

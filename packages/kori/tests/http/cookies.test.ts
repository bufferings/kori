import { describe, expect, test } from 'vitest';

import { deleteCookie, parseCookies, serializeCookie } from '../../src/http/cookies.js';

describe('Cookie utilities', () => {
  describe('parseCookies', () => {
    test('should parse simple cookie', () => {
      const result = parseCookies('session_id=abc123');
      expect(result).toEqual({ session_id: 'abc123' });
    });

    test('should parse multiple cookies', () => {
      const result = parseCookies('session_id=abc123; username=john; theme=dark');
      expect(result).toEqual({
        session_id: 'abc123',
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
      const result1 = parseCookies('session_id=; username=john');
      expect(result1).toEqual({ session_id: '', username: 'john' });

      // Cookie without equals sign
      const result2 = parseCookies('session_id; username=john');
      expect(result2).toEqual({ username: 'john' });

      // Extra spaces
      const result3 = parseCookies('  session_id = abc123  ;  username = john  ');
      expect(result3).toEqual({ session_id: 'abc123', username: 'john' });
    });

    test('should handle malformed URI encoding gracefully', () => {
      // Malformed percent encoding
      const result1 = parseCookies('session_id=%ZZ; username=john');
      expect(result1).toEqual({ session_id: '%ZZ', username: 'john' });

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
      const result = serializeCookie('session_id', 'abc123');
      expect(result).toBe('session_id=abc123');
    });

    test('should URL encode cookie value', () => {
      const result = serializeCookie('message', 'hello world');
      expect(result).toBe('message=hello%20world');
    });

    test('should include expires option', () => {
      // Use a date 24 hours from now to avoid hardcoded dates
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const result = serializeCookie('session_id', 'abc123', { expires });
      expect(result).toBe(`session_id=abc123; expires=${expires.toUTCString()}`);
    });

    test('should include maxAge option', () => {
      const result = serializeCookie('session_id', 'abc123', { maxAge: 3600 });
      expect(result).toBe('session_id=abc123; max-age=3600');
    });

    test('should include domain option', () => {
      const result = serializeCookie('session_id', 'abc123', { domain: 'example.com' });
      expect(result).toBe('session_id=abc123; domain=example.com');
    });

    test('should include path option', () => {
      const result = serializeCookie('session_id', 'abc123', { path: '/api' });
      expect(result).toBe('session_id=abc123; path=/api');
    });

    test('should include secure flag', () => {
      const result = serializeCookie('session_id', 'abc123', { secure: true });
      expect(result).toBe('session_id=abc123; secure');
    });

    test('should include httpOnly flag', () => {
      const result = serializeCookie('session_id', 'abc123', { httpOnly: true });
      expect(result).toBe('session_id=abc123; httponly');
    });

    test('should include sameSite option', () => {
      const result1 = serializeCookie('session_id', 'abc123', { sameSite: 'strict' });
      expect(result1).toBe('session_id=abc123; samesite=strict');

      const result2 = serializeCookie('session_id', 'abc123', { sameSite: 'lax' });
      expect(result2).toBe('session_id=abc123; samesite=lax');

      const result3 = serializeCookie('session_id', 'abc123', { sameSite: 'none' });
      expect(result3).toBe('session_id=abc123; samesite=none');
    });

    test('should include all options', () => {
      // Use a date 24 hours from now to avoid hardcoded dates
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const result = serializeCookie('session_id', 'abc123', {
        expires,
        maxAge: 3600,
        domain: 'example.com',
        path: '/api',
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
      });
      expect(result).toBe(
        `session_id=abc123; expires=${expires.toUTCString()}; max-age=3600; domain=example.com; path=/api; secure; httponly; samesite=strict`,
      );
    });

    test('should handle encoding errors gracefully', () => {
      // Most values should encode fine, but if encoding fails, use raw value
      const result1 = serializeCookie('session_id', 'normal-value');
      expect(result1).toBe('session_id=normal-value');

      const result2 = serializeCookie('data', 'value with spaces');
      expect(result2).toBe('data=value%20with%20spaces');
    });
  });

  describe('deleteCookie', () => {
    test('should create cookie deletion string', () => {
      const result = deleteCookie('session_id');
      expect(result).toBe('session_id=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0');
    });

    test('should include path and domain options', () => {
      const result = deleteCookie('session_id', { path: '/api', domain: 'example.com' });
      expect(result).toBe(
        'session_id=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; domain=example.com; path=/api',
      );
    });
  });
});

describe('Cookie name validation', () => {
  describe('Valid cookie names (RFC 6265 compliant)', () => {
    test('should accept letters and numbers', () => {
      expect(() => serializeCookie('sessionId123', 'value')).not.toThrow();
      expect(() => serializeCookie('ABC', 'value')).not.toThrow();
      expect(() => serializeCookie('abc', 'value')).not.toThrow();
      expect(() => serializeCookie('test123', 'value')).not.toThrow();
    });

    test('should accept underscore and hyphen', () => {
      expect(() => serializeCookie('session_id', 'value')).not.toThrow();
      expect(() => serializeCookie('user-token', 'value')).not.toThrow();
      expect(() => serializeCookie('_private', 'value')).not.toThrow();
      expect(() => serializeCookie('test-123_abc', 'value')).not.toThrow();
    });

    test('should accept dot and tilde', () => {
      expect(() => serializeCookie('my.app', 'value')).not.toThrow();
      expect(() => serializeCookie('version~1', 'value')).not.toThrow();
      expect(() => serializeCookie('app.session.v1', 'value')).not.toThrow();
    });

    test('should accept special RFC 6265 characters', () => {
      expect(() => serializeCookie('token!', 'value')).not.toThrow();
      expect(() => serializeCookie('id#123', 'value')).not.toThrow();
      expect(() => serializeCookie('session$', 'value')).not.toThrow();
      expect(() => serializeCookie('user&app', 'value')).not.toThrow();
      expect(() => serializeCookie("auth'token", 'value')).not.toThrow();
      expect(() => serializeCookie('data*', 'value')).not.toThrow();
      expect(() => serializeCookie('version+1', 'value')).not.toThrow();
      expect(() => serializeCookie('meta^data', 'value')).not.toThrow();
      expect(() => serializeCookie('config`test', 'value')).not.toThrow();
      expect(() => serializeCookie('type|user', 'value')).not.toThrow();
    });

    test('should accept complex valid names', () => {
      expect(() => serializeCookie('my-app.session_id#123', 'value')).not.toThrow();
      expect(() => serializeCookie('user~token$auth+v1', 'value')).not.toThrow();
    });
  });

  describe('Invalid cookie names', () => {
    test('should reject empty name', () => {
      expect(() => serializeCookie('', 'value')).toThrow('Cookie name cannot be empty');
    });

    test('should reject names with spaces', () => {
      expect(() => serializeCookie('session id', 'value')).toThrow(/Invalid cookie name.*RFC 6265 compliant/);
      expect(() => serializeCookie(' session', 'value')).toThrow(/Invalid cookie name.*RFC 6265 compliant/);
      expect(() => serializeCookie('session ', 'value')).toThrow(/Invalid cookie name.*RFC 6265 compliant/);
    });

    test('should reject names with control characters', () => {
      expect(() => serializeCookie('session\t', 'value')).toThrow(/Invalid cookie name/);
      expect(() => serializeCookie('session\n', 'value')).toThrow(/Invalid cookie name/);
      expect(() => serializeCookie('session\r', 'value')).toThrow(/Invalid cookie name/);
    });

    test('should reject names with separators', () => {
      expect(() => serializeCookie('session()', 'value')).toThrow(/Invalid cookie name.*RFC 6265 compliant/);
      expect(() => serializeCookie('session<>', 'value')).toThrow(/Invalid cookie name.*RFC 6265 compliant/);
      expect(() => serializeCookie('session@', 'value')).toThrow(/Invalid cookie name.*RFC 6265 compliant/);
      expect(() => serializeCookie('session,id', 'value')).toThrow(/Invalid cookie name.*RFC 6265 compliant/);
      expect(() => serializeCookie('session;id', 'value')).toThrow(/Invalid cookie name.*RFC 6265 compliant/);
      expect(() => serializeCookie('session:id', 'value')).toThrow(/Invalid cookie name.*RFC 6265 compliant/);
      expect(() => serializeCookie('session\\id', 'value')).toThrow(/Invalid cookie name.*RFC 6265 compliant/);
      expect(() => serializeCookie('session"id', 'value')).toThrow(/Invalid cookie name.*RFC 6265 compliant/);
      expect(() => serializeCookie('session/id', 'value')).toThrow(/Invalid cookie name.*RFC 6265 compliant/);
      expect(() => serializeCookie('session[id]', 'value')).toThrow(/Invalid cookie name.*RFC 6265 compliant/);
      expect(() => serializeCookie('session?id', 'value')).toThrow(/Invalid cookie name.*RFC 6265 compliant/);
      expect(() => serializeCookie('session=id', 'value')).toThrow(/Invalid cookie name.*RFC 6265 compliant/);
      expect(() => serializeCookie('session{id}', 'value')).toThrow(/Invalid cookie name.*RFC 6265 compliant/);
    });

    test('should reject Unicode and extended ASCII characters', () => {
      // Using escape sequences to avoid non-ASCII characters in source
      expect(() => serializeCookie('\u30bb\u30c3\u30b7\u30e7\u30f3', 'value')).toThrow(
        /Invalid cookie name.*RFC 6265 compliant/,
      );
      expect(() => serializeCookie('session\u2122', 'value')).toThrow(/Invalid cookie name.*RFC 6265 compliant/);
      expect(() => serializeCookie('caf\u00e9', 'value')).toThrow(/Invalid cookie name.*RFC 6265 compliant/);
    });
  });

  describe('deleteCookie validation', () => {
    test('should validate cookie name in deleteCookie', () => {
      expect(() => deleteCookie('validName')).not.toThrow();
      expect(() => deleteCookie('valid_name-123')).not.toThrow();
      expect(() => deleteCookie('')).toThrow('Cookie name cannot be empty');
      expect(() => deleteCookie('invalid name')).toThrow(/Invalid cookie name.*RFC 6265 compliant/);
      expect(() => deleteCookie('invalid;name')).toThrow(/Invalid cookie name.*RFC 6265 compliant/);
    });
  });
});

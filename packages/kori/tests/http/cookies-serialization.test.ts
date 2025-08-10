import { describe, expect, test } from 'vitest';

import { serializeCookie } from '../../src/http/cookies.js';

describe('serializeCookie', () => {
  describe('basic functionality', () => {
    test('should serialize simple cookie', () => {
      const result = serializeCookie('session_id', 'abc123');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('session_id=abc123');
      }
    });

    test('should URL encode cookie value', () => {
      const result = serializeCookie('message', 'hello world');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('message=hello%20world');
      }
    });
  });

  describe('options', () => {
    test('should include expires option', () => {
      const expires = new Date('2024-12-31T23:59:59.000Z');
      const result = serializeCookie('session_id', 'abc123', { expires });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('session_id=abc123; Expires=Tue, 31 Dec 2024 23:59:59 GMT');
      }
    });

    test('should include maxAge option', () => {
      const result = serializeCookie('session_id', 'abc123', { maxAge: 3600 });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('session_id=abc123; Max-Age=3600');
      }
    });

    test('should include domain option', () => {
      const result = serializeCookie('session_id', 'abc123', { domain: 'example.com' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('session_id=abc123; Domain=example.com');
      }
    });

    test('should include path option', () => {
      const result = serializeCookie('session_id', 'abc123', { path: '/api' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('session_id=abc123; Path=/api');
      }
    });

    test('should include secure flag', () => {
      const result = serializeCookie('session_id', 'abc123', { secure: true });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('session_id=abc123; Secure');
      }
    });

    test('should include httpOnly flag', () => {
      const result = serializeCookie('session_id', 'abc123', { httpOnly: true });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('session_id=abc123; HttpOnly');
      }
    });

    test('should include sameSite option', () => {
      const result1 = serializeCookie('session_id', 'abc123', { sameSite: 'strict' });
      expect(result1.ok).toBe(true);
      if (result1.ok) {
        expect(result1.value).toBe('session_id=abc123; SameSite=Strict');
      }

      const result2 = serializeCookie('session_id', 'abc123', { sameSite: 'lax' });
      expect(result2.ok).toBe(true);
      if (result2.ok) {
        expect(result2.value).toBe('session_id=abc123; SameSite=Lax');
      }

      const result3 = serializeCookie('session_id', 'abc123', { sameSite: 'none', secure: true });
      expect(result3.ok).toBe(true);
      if (result3.ok) {
        expect(result3.value).toBe('session_id=abc123; Secure; SameSite=None');
      }
    });

    test('should include all options', () => {
      const expires = new Date('2024-12-31T23:59:59.000Z');
      const result = serializeCookie('session_id', 'abc123', {
        expires,
        maxAge: 3600,
        domain: 'example.com',
        path: '/api',
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(
          'session_id=abc123; Max-Age=3600; Domain=example.com; Path=/api; Expires=Tue, 31 Dec 2024 23:59:59 GMT; HttpOnly; Secure; SameSite=Strict',
        );
      }
    });
  });

  describe('cookie names', () => {
    test.each([
      // Letters and numbers
      'sessionId123',
      'ABC',
      'abc',
      'test123',
      // Underscore and hyphen
      'session_id',
      'user-token',
      '_private',
      'test-123_abc',
      // Dot and tilde
      'my.app',
      'version~1',
      'app.session.v1',
      // Special RFC 6265 characters
      'token!',
      'id#123',
      'session$',
      'data%encoded',
      'user&app',
      "auth'token",
      'data*',
      'version+1',
      'meta^data',
      'config`test',
      'type|user',
      // Complex valid names
      'my-app.session_id#123',
      'user~token$auth+v1',
    ])('should accept valid cookie name: %s', (cookieName) => {
      expect(serializeCookie(cookieName, 'value').ok).toBe(true);
    });

    test('should reject empty name', () => {
      const result = serializeCookie('', 'value');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INVALID_NAME');
        expect(result.error.message).toContain('Cookie name cannot be empty');
      }
    });

    test('should reject names with spaces', () => {
      const result1 = serializeCookie('session id', 'value');
      expect(result1.ok).toBe(false);
      if (!result1.ok) {
        expect(result1.error.type).toBe('INVALID_NAME');
        expect(result1.error.message).toContain('RFC 6265 compliant');
      }

      const result2 = serializeCookie(' session', 'value');
      expect(result2.ok).toBe(false);
      if (!result2.ok) {
        expect(result2.error.type).toBe('INVALID_NAME');
      }

      const result3 = serializeCookie('session ', 'value');
      expect(result3.ok).toBe(false);
      if (!result3.ok) {
        expect(result3.error.type).toBe('INVALID_NAME');
      }
    });

    test('should reject names with control characters', () => {
      const result1 = serializeCookie('session\t', 'value');
      expect(result1.ok).toBe(false);
      if (!result1.ok) {
        expect(result1.error.type).toBe('INVALID_NAME');
      }

      const result2 = serializeCookie('session\n', 'value');
      expect(result2.ok).toBe(false);
      if (!result2.ok) {
        expect(result2.error.type).toBe('INVALID_NAME');
      }

      const result3 = serializeCookie('session\r', 'value');
      expect(result3.ok).toBe(false);
      if (!result3.ok) {
        expect(result3.error.type).toBe('INVALID_NAME');
      }
    });

    test.each([
      'session()',
      'session<>',
      'session@',
      'session,id',
      'session;id',
      'session:id',
      'session\\id',
      'session"id',
      'session/id',
      'session[id]',
      'session?id',
      'session=id',
      'session{id}',
    ])('should reject cookie name with separator: %s', (cookieName) => {
      const result = serializeCookie(cookieName, 'value');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INVALID_NAME');
        expect(result.error.message).toContain('RFC 6265 compliant');
      }
    });

    test('should reject Unicode and extended ASCII characters', () => {
      // Using escape sequences to avoid non-ASCII characters in source
      const result1 = serializeCookie('\u30bb\u30c3\u30b7\u30e7\u30f3', 'value');
      expect(result1.ok).toBe(false);
      if (!result1.ok) {
        expect(result1.error.type).toBe('INVALID_NAME');
        expect(result1.error.message).toContain('RFC 6265 compliant');
      }

      const result2 = serializeCookie('session\u2122', 'value');
      expect(result2.ok).toBe(false);
      if (!result2.ok) {
        expect(result2.error.type).toBe('INVALID_NAME');
      }

      const result3 = serializeCookie('caf\u00e9', 'value');
      expect(result3.ok).toBe(false);
      if (!result3.ok) {
        expect(result3.error.type).toBe('INVALID_NAME');
      }
    });
  });

  describe('prefix constraints', () => {
    test('should accept valid __Secure- prefix with secure', () => {
      const result = serializeCookie('__Secure-token', 'value', { secure: true });
      expect(result.ok).toBe(true);
    });

    test('should reject __Secure- prefix without secure (runtime)', () => {
      const result = serializeCookie('__Secure-token', 'value', {} as any);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('PREFIX_VIOLATION');
        if (result.error.type === 'PREFIX_VIOLATION') {
          expect(result.error.prefix).toBe('__Secure-');
          expect(result.error.required).toBe('secure: true');
        }
      }
    });

    test('should accept valid __Host- prefix with secure and path', () => {
      const result = serializeCookie('__Host-session', 'value', { secure: true, path: '/' });
      expect(result.ok).toBe(true);
    });

    test('should reject __Host- prefix without secure (runtime)', () => {
      const result = serializeCookie('__Host-session', 'value', { path: '/' } as any);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('PREFIX_VIOLATION');
        if (result.error.type === 'PREFIX_VIOLATION') {
          expect(result.error.prefix).toBe('__Host-');
          expect(result.error.required).toBe('secure: true');
        }
      }
    });

    test('should reject __Host- prefix without correct path (runtime)', () => {
      const result = serializeCookie('__Host-session', 'value', { secure: true, path: '/admin' } as any);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('PREFIX_VIOLATION');
        if (result.error.type === 'PREFIX_VIOLATION') {
          expect(result.error.prefix).toBe('__Host-');
          expect(result.error.required).toBe('path: "/"');
        }
      }
    });

    test('should reject __Host- prefix with domain (runtime)', () => {
      const result = serializeCookie('__Host-session', 'value', {
        secure: true,
        path: '/',
        domain: 'example.com',
      } as any);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('PREFIX_VIOLATION');
        if (result.error.type === 'PREFIX_VIOLATION') {
          expect(result.error.prefix).toBe('__Host-');
          expect(result.error.required).toBe('no domain attribute');
        }
      }
    });
  });

  describe('age limits (RFC 6265bis)', () => {
    test('should accept valid MaxAge', () => {
      const result = serializeCookie('session', 'value', { maxAge: 3600 });
      expect(result.ok).toBe(true);
    });

    test('should reject MaxAge exceeding 400 days', () => {
      const result = serializeCookie('session', 'value', { maxAge: 50000000 }); // > 400 days
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('AGE_LIMIT_EXCEEDED');
        if (result.error.type === 'AGE_LIMIT_EXCEEDED') {
          expect(result.error.limit).toBe(34560000); // 400 days in seconds
        }
      }
    });

    test('should accept valid Expires', () => {
      const result = serializeCookie('session', 'value', {
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      expect(result.ok).toBe(true);
    });

    test('should reject Expires exceeding 400 days', () => {
      const result = serializeCookie('session', 'value', {
        expires: new Date(Date.now() + 500 * 24 * 60 * 60 * 1000),
      }); // 500 days (exceeds 400-day limit)
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('EXPIRES_LIMIT_EXCEEDED');
        if (result.error.type === 'EXPIRES_LIMIT_EXCEEDED') {
          expect(result.error.limit).toBe(34560000);
        }
      }
    });
  });

  describe('partitioned cookie constraints', () => {
    test('should accept valid partitioned cookie', () => {
      const result = serializeCookie('session', 'value', { partitioned: true, secure: true, sameSite: 'None' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toContain('Partitioned');
        expect(result.value).toContain('SameSite=None');
      }
    });

    test('should reject partitioned cookie without secure (runtime)', () => {
      const result = serializeCookie('session', 'value', { partitioned: true } as any);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('PARTITIONED_REQUIRES_SECURE');
      }
    });

    test('should reject partitioned cookie without SameSite=None (runtime)', () => {
      const result = serializeCookie('session', 'value', {
        partitioned: true,
        secure: true,
        sameSite: 'lax',
      } as any);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('PARTITIONED_REQUIRES_SAMESITE_NONE');
      }
    });
  });

  describe('samesite constraints', () => {
    test('should accept SameSite=None with Secure', () => {
      const result = serializeCookie('session', 'value', { sameSite: 'none', secure: true });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toContain('SameSite=None');
        expect(result.value).toContain('Secure');
      }
    });

    test('should reject SameSite=None without Secure (runtime)', () => {
      const result = serializeCookie('session', 'value', { sameSite: 'none' } as any);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('SAMESITE_NONE_REQUIRES_SECURE');
      }
    });
  });
});

import { describe, expect, test } from 'vitest';

import { deleteCookie, parseCookies, serializeCookie } from '../../src/http/cookies.js';

describe('Cookie utilities', () => {
  describe('parseCookies', () => {
    test('should parse simple cookie', () => {
      const result = parseCookies('session_id=abc123');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({ session_id: 'abc123' });
      }
    });

    test('should parse multiple cookies', () => {
      const result = parseCookies('session_id=abc123; username=john; theme=dark');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({
          session_id: 'abc123',
          username: 'john',
          theme: 'dark',
        });
      }
    });

    test('should handle URL encoded values', () => {
      const result = parseCookies('message=hello%20world; name=john%40example.com');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({
          message: 'hello world',
          name: 'john@example.com',
        });
      }
    });

    test('should handle empty cookie header', () => {
      const result1 = parseCookies('');
      expect(result1.ok).toBe(true);
      if (result1.ok) {
        expect(result1.value).toEqual({});
      }

      const result2 = parseCookies(undefined);
      expect(result2.ok).toBe(true);
      if (result2.ok) {
        expect(result2.value).toEqual({});
      }
    });

    test('should handle malformed cookies', () => {
      // Cookie without value
      const result1 = parseCookies('session_id=; username=john');
      expect(result1.ok).toBe(true);
      if (result1.ok) {
        expect(result1.value).toEqual({ session_id: '', username: 'john' });
      }

      // Cookie without equals sign
      const result2 = parseCookies('session_id; username=john');
      expect(result2.ok).toBe(true);
      if (result2.ok) {
        expect(result2.value).toEqual({ username: 'john' });
      }

      // Extra spaces
      const result3 = parseCookies('  session_id = abc123  ;  username = john  ');
      expect(result3.ok).toBe(true);
      if (result3.ok) {
        expect(result3.value).toEqual({ session_id: 'abc123', username: 'john' });
      }
    });

    test('should handle malformed URI encoding gracefully', () => {
      // Malformed percent encoding
      const result1 = parseCookies('session_id=%ZZ; username=john');
      expect(result1.ok).toBe(true);
      if (result1.ok) {
        expect(result1.value).toEqual({ session_id: '%ZZ', username: 'john' });
      }

      // Incomplete percent encoding
      const result2 = parseCookies('data=%2; valid=test');
      expect(result2.ok).toBe(true);
      if (result2.ok) {
        expect(result2.value).toEqual({ data: '%2', valid: 'test' });
      }

      // Invalid UTF-8 sequence
      const result3 = parseCookies('token=%C0%80; user=alice');
      expect(result3.ok).toBe(true);
      if (result3.ok) {
        expect(result3.value).toEqual({ token: '%C0%80', user: 'alice' });
      }

      // Multiple malformed values should not affect parsing of valid ones
      const result4 = parseCookies('bad1=%ZZ; good=valid; bad2=%2; another=test');
      expect(result4.ok).toBe(true);
      if (result4.ok) {
        expect(result4.value).toEqual({ bad1: '%ZZ', good: 'valid', bad2: '%2', another: 'test' });
      }
    });
  });

  describe('serializeCookie', () => {
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

    test('should include expires option', () => {
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const result = serializeCookie('session_id', 'abc123', { expires });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(`session_id=abc123; Expires=${expires.toUTCString()}`);
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
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(
          `session_id=abc123; Max-Age=3600; Domain=example.com; Path=/api; Expires=${expires.toUTCString()}; HttpOnly; Secure; SameSite=Strict`,
        );
      }
    });

    test('should handle encoding errors gracefully', () => {
      const result1 = serializeCookie('session_id', 'normal-value');
      expect(result1.ok).toBe(true);
      if (result1.ok) {
        expect(result1.value).toBe('session_id=normal-value');
      }

      const result2 = serializeCookie('data', 'value with spaces');
      expect(result2.ok).toBe(true);
      if (result2.ok) {
        expect(result2.value).toBe('data=value%20with%20spaces');
      }
    });
  });

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
  });
});

describe('Cookie validation and errors', () => {
  describe('Valid cookie names (RFC 6265 compliant)', () => {
    test('should accept letters and numbers', () => {
      expect(serializeCookie('sessionId123', 'value').ok).toBe(true);
      expect(serializeCookie('ABC', 'value').ok).toBe(true);
      expect(serializeCookie('abc', 'value').ok).toBe(true);
      expect(serializeCookie('test123', 'value').ok).toBe(true);
    });

    test('should accept underscore and hyphen', () => {
      expect(serializeCookie('session_id', 'value').ok).toBe(true);
      expect(serializeCookie('user-token', 'value').ok).toBe(true);
      expect(serializeCookie('_private', 'value').ok).toBe(true);
      expect(serializeCookie('test-123_abc', 'value').ok).toBe(true);
    });

    test('should accept dot and tilde', () => {
      expect(serializeCookie('my.app', 'value').ok).toBe(true);
      expect(serializeCookie('version~1', 'value').ok).toBe(true);
      expect(serializeCookie('app.session.v1', 'value').ok).toBe(true);
    });

    test('should accept special RFC 6265 characters', () => {
      expect(serializeCookie('token!', 'value').ok).toBe(true);
      expect(serializeCookie('id#123', 'value').ok).toBe(true);
      expect(serializeCookie('session$', 'value').ok).toBe(true);
      expect(serializeCookie('data%encoded', 'value').ok).toBe(true);
      expect(serializeCookie('user&app', 'value').ok).toBe(true);
      expect(serializeCookie("auth'token", 'value').ok).toBe(true);
      expect(serializeCookie('data*', 'value').ok).toBe(true);
      expect(serializeCookie('version+1', 'value').ok).toBe(true);
      expect(serializeCookie('meta^data', 'value').ok).toBe(true);
      expect(serializeCookie('config`test', 'value').ok).toBe(true);
      expect(serializeCookie('type|user', 'value').ok).toBe(true);
    });

    test('should accept complex valid names', () => {
      expect(serializeCookie('my-app.session_id#123', 'value').ok).toBe(true);
      expect(serializeCookie('user~token$auth+v1', 'value').ok).toBe(true);
    });
  });

  describe('Invalid cookie names', () => {
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

    test('should reject names with separators', () => {
      const invalidNames = [
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
      ];

      for (const name of invalidNames) {
        const result = serializeCookie(name, 'value');
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('INVALID_NAME');
          expect(result.error.message).toContain('RFC 6265 compliant');
        }
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

  describe('Prefix constraints', () => {
    test('should enforce __Secure- prefix constraints', () => {
      // Valid __Secure- cookie
      const valid = serializeCookie('__Secure-token', 'value', { secure: true });
      expect(valid.ok).toBe(true);

      // Invalid __Secure- cookie without secure
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      const invalid = serializeCookie('__Secure-token', 'value', {} as any);
      expect(invalid.ok).toBe(false);
      if (!invalid.ok) {
        expect(invalid.error.type).toBe('PREFIX_VIOLATION');
        if (invalid.error.type === 'PREFIX_VIOLATION') {
          expect(invalid.error.prefix).toBe('__Secure-');
          expect(invalid.error.required).toBe('secure: true');
        }
      }
    });

    test('should enforce __Host- prefix constraints', () => {
      // Valid __Host- cookie
      const valid = serializeCookie('__Host-session', 'value', { secure: true, path: '/' });
      expect(valid.ok).toBe(true);

      // Invalid __Host- cookie without secure
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      const invalid1 = serializeCookie('__Host-session', 'value', { path: '/' } as any);
      expect(invalid1.ok).toBe(false);
      if (!invalid1.ok) {
        expect(invalid1.error.type).toBe('PREFIX_VIOLATION');
        if (invalid1.error.type === 'PREFIX_VIOLATION') {
          expect(invalid1.error.prefix).toBe('__Host-');
          expect(invalid1.error.required).toBe('secure: true');
        }
      }

      // Invalid __Host- cookie without path: '/'
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      const invalid2 = serializeCookie('__Host-session', 'value', { secure: true, path: '/admin' } as any);
      expect(invalid2.ok).toBe(false);
      if (!invalid2.ok) {
        expect(invalid2.error.type).toBe('PREFIX_VIOLATION');
        if (invalid2.error.type === 'PREFIX_VIOLATION') {
          expect(invalid2.error.prefix).toBe('__Host-');
          expect(invalid2.error.required).toBe('path: "/"');
        }
      }

      // Invalid __Host- cookie with domain
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const invalid3 = serializeCookie('__Host-session', 'value', {
        secure: true,
        path: '/',
        domain: 'example.com',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      expect(invalid3.ok).toBe(false);
      if (!invalid3.ok) {
        expect(invalid3.error.type).toBe('PREFIX_VIOLATION');
        if (invalid3.error.type === 'PREFIX_VIOLATION') {
          expect(invalid3.error.prefix).toBe('__Host-');
          expect(invalid3.error.required).toBe('no domain attribute');
        }
      }
    });
  });

  describe('Age limits (RFC 6265bis)', () => {
    test('should enforce MaxAge limit', () => {
      const validAge = serializeCookie('session', 'value', { maxAge: 3600 });
      expect(validAge.ok).toBe(true);

      const invalidAge = serializeCookie('session', 'value', { maxAge: 50000000 }); // > 400 days
      expect(invalidAge.ok).toBe(false);
      if (!invalidAge.ok) {
        expect(invalidAge.error.type).toBe('AGE_LIMIT_EXCEEDED');
        if (invalidAge.error.type === 'AGE_LIMIT_EXCEEDED') {
          expect(invalidAge.error.limit).toBe(34560000); // 400 days in seconds
        }
      }
    });

    test('should enforce Expires limit', () => {
      const validExpires = serializeCookie('session', 'value', { expires: new Date(Date.now() + 24 * 60 * 60 * 1000) });
      expect(validExpires.ok).toBe(true);

      const invalidExpires = serializeCookie('session', 'value', {
        expires: new Date(Date.now() + 500 * 24 * 60 * 60 * 1000),
      }); // 500 days
      expect(invalidExpires.ok).toBe(false);
      if (!invalidExpires.ok) {
        expect(invalidExpires.error.type).toBe('EXPIRES_LIMIT_EXCEEDED');
        if (invalidExpires.error.type === 'EXPIRES_LIMIT_EXCEEDED') {
          expect(invalidExpires.error.limit).toBe(34560000);
        }
      }
    });
  });

  describe('Partitioned cookie constraints', () => {
    test('should enforce secure requirement for partitioned cookies', () => {
      const valid = serializeCookie('session', 'value', { partitioned: true, secure: true });
      expect(valid.ok).toBe(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      const invalid = serializeCookie('session', 'value', { partitioned: true } as any);
      expect(invalid.ok).toBe(false);
      if (!invalid.ok) {
        expect(invalid.error.type).toBe('PARTITIONED_REQUIRES_SECURE');
      }
    });
  });

  describe('SameSite None requires Secure', () => {
    test('should error when SameSite=None without Secure (runtime)', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      const result = serializeCookie('session', 'value', { sameSite: 'none' } as any);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('SAMESITE_NONE_REQUIRES_SECURE');
      }
    });

    test('should succeed when SameSite=None with Secure', () => {
      const result = serializeCookie('session', 'value', { sameSite: 'none', secure: true });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toContain('SameSite=None');
        expect(result.value).toContain('Secure');
      }
    });
  });

  describe('deleteCookie validation', () => {
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
});

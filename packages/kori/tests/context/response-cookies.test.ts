import { describe, test, expect } from 'vitest';

import { KoriCookieError } from '../../src/error/index.js';

import { type KoriRequest } from '../../src/context/request.js';
import { createKoriResponse } from '../../src/context/response.js';

const mockReq = { header: () => undefined } as unknown as KoriRequest;

describe('KoriResponse cookies contract', () => {
  describe('setCookie()', () => {
    test('serializes attributes into Set-Cookie header', () => {
      const res = createKoriResponse(mockReq);
      res.setCookie('id', 'abc', { path: '/', httpOnly: true, secure: true, sameSite: 'None' });

      const built = res.build();
      const header = built.headers.get('set-cookie');
      expect(header).toBeTruthy();
      if (header) {
        expect(header.includes('id=abc')).toBe(true);
        expect(header.includes('Path=/')).toBe(true);
        expect(header.includes('HttpOnly')).toBe(true);
        expect(header.includes('Secure')).toBe(true);
        expect(header.includes('SameSite=None')).toBe(true);
      }
    });

    test('appends multiple cookies', () => {
      const res = createKoriResponse(mockReq);
      res.setCookie('a', '1').setCookie('b', '2');

      const built = res.build();
      const header = built.headers.get('set-cookie');
      // Environment may combine or keep last, but should include both substrings
      expect(header).toBeTruthy();
      if (header) {
        expect(header.includes('a=1')).toBe(true);
        expect(header.includes('b=2')).toBe(true);
      }
    });

    test('encodes value with encodeURIComponent', () => {
      const res = createKoriResponse(mockReq);
      res.setCookie('msg', 'hello world');
      const built = res.build();
      const header = built.headers.get('set-cookie');
      expect(header).toBeTruthy();
      if (header) {
        expect(header.includes('msg=hello%20world')).toBe(true);
      }
    });

    test("getHeader('set-cookie') aggregates multiple cookies before build", () => {
      const res = createKoriResponse(mockReq);
      res.setCookie('a', '1');
      res.setCookie('b', '2');
      const header = res.getHeader('set-cookie');
      expect(header).toBeTruthy();
      if (header) {
        expect(header.includes('a=1')).toBe(true);
        expect(header.includes('b=2')).toBe(true);
      }
    });

    test('throws KoriCookieError for invalid name with structured error', () => {
      const res = createKoriResponse(mockReq);
      try {
        res.setCookie('invalid name', 'x');
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(KoriCookieError);
        const ke = e as KoriCookieError;
        expect(ke.code).toBe('COOKIE_ERROR');
        expect(ke.cookieError.type).toBe('INVALID_NAME');
        expect(ke.cookieError.message).toContain('Invalid');
      }
    });

    test('enforces __Secure- prefix secure constraint with structured error', () => {
      const res = createKoriResponse(mockReq);
      try {
        res.setCookie('__Secure-token', 'x');
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(KoriCookieError);
        const ke = e as KoriCookieError;
        expect(ke.cookieError.type).toBe('PREFIX_VIOLATION');
        if (ke.cookieError.type === 'PREFIX_VIOLATION') {
          expect(ke.cookieError.prefix).toBe('__Secure-');
          expect(ke.cookieError.required).toBe('secure: true');
        }
      }
    });

    test('enforces __Host- prefix path/domain/secure constraints with structured error', () => {
      const res = createKoriResponse(mockReq);
      // missing secure
      try {
        res.setCookie('__Host-session', 'v', { path: '/' } as any);
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(KoriCookieError);
        const ke = e as KoriCookieError;
        expect(ke.cookieError.type).toBe('PREFIX_VIOLATION');
        if (ke.cookieError.type === 'PREFIX_VIOLATION') {
          expect(ke.cookieError.prefix).toBe('__Host-');
          expect(ke.cookieError.required).toBe('secure: true');
        }
      }
      // wrong path
      try {
        res.setCookie('__Host-session', 'v', { secure: true, path: '/admin' } as any);
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(KoriCookieError);
        const ke = e as KoriCookieError;
        expect(ke.cookieError.type).toBe('PREFIX_VIOLATION');
        if (ke.cookieError.type === 'PREFIX_VIOLATION') {
          expect(ke.cookieError.prefix).toBe('__Host-');
          expect(ke.cookieError.required).toBe('path: "/"');
        }
      }
      // domain not allowed
      try {
        res.setCookie('__Host-session', 'v', { secure: true, path: '/', domain: 'example.com' } as any);
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(KoriCookieError);
        const ke = e as KoriCookieError;
        expect(ke.cookieError.type).toBe('PREFIX_VIOLATION');
        if (ke.cookieError.type === 'PREFIX_VIOLATION') {
          expect(ke.cookieError.prefix).toBe('__Host-');
          expect(ke.cookieError.required).toBe('no domain attribute');
        }
      }
    });

    test('AGE_LIMIT_EXCEEDED when maxAge > 400 days', () => {
      const res = createKoriResponse(mockReq);
      try {
        res.setCookie('a', 'b', { maxAge: 34560001 });
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(KoriCookieError);
        const ke = e as KoriCookieError;
        expect(ke.cookieError.type).toBe('AGE_LIMIT_EXCEEDED');
      }
    });

    test('EXPIRES_LIMIT_EXCEEDED when expires > 400 days', () => {
      const res = createKoriResponse(mockReq);
      try {
        const expires = new Date(Date.now() + 401 * 24 * 60 * 60 * 1000);
        res.setCookie('a', 'b', { expires });
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(KoriCookieError);
        const ke = e as KoriCookieError;
        expect(ke.cookieError.type).toBe('EXPIRES_LIMIT_EXCEEDED');
      }
    });

    test('PARTITIONED_REQUIRES_SECURE when partitioned without secure', () => {
      const res = createKoriResponse(mockReq);
      try {
        res.setCookie('sid', 'v', { partitioned: true } as any);
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(KoriCookieError);
        const ke = e as KoriCookieError;
        expect(ke.cookieError.type).toBe('PARTITIONED_REQUIRES_SECURE');
      }
    });

    test('SAMESITE_NONE_REQUIRES_SECURE when SameSite=None without secure', () => {
      const res = createKoriResponse(mockReq);
      try {
        res.setCookie('sid', 'v', { sameSite: 'none' } as any);
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(KoriCookieError);
        const ke = e as KoriCookieError;
        expect(ke.cookieError.type).toBe('SAMESITE_NONE_REQUIRES_SECURE');
      }
    });

    test('PARTITIONED_REQUIRES_SAMESITE_NONE when partitioned without SameSite=None', () => {
      const res = createKoriResponse(mockReq);
      try {
        res.setCookie('sid', 'v', { partitioned: true, secure: true, sameSite: 'lax' } as any);
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(KoriCookieError);
        const ke = e as KoriCookieError;
        expect(ke.cookieError.type).toBe('PARTITIONED_REQUIRES_SAMESITE_NONE');
      }
    });

    test('SERIALIZE_ERROR when encodeURIComponent throws', () => {
      const res = createKoriResponse(mockReq);
      try {
        // Unpaired high surrogate causes encodeURIComponent to throw
        res.setCookie('bad', '\uD800');
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(KoriCookieError);
        const ke = e as KoriCookieError;
        expect(ke.cookieError.type).toBe('SERIALIZE_ERROR');
      }
    });
  });

  describe('clearCookie()', () => {
    test('serializes deletion with scope', () => {
      const res = createKoriResponse(mockReq);
      res.clearCookie('sess', { path: '/' });

      const built = res.build();
      const header = built.headers.get('set-cookie');
      expect(header).toBeTruthy();
      if (header) {
        expect(header.includes('sess=')).toBe(true);
        expect(header.includes('Max-Age=0')).toBe(true);
        expect(header.includes('Expires=Thu, 01 Jan 1970 00:00:00 GMT')).toBe(true);
        expect(header.includes('Path=/')).toBe(true);
      }
    });

    test('throws KoriCookieError for invalid name with structured error', () => {
      const res = createKoriResponse(mockReq);
      try {
        res.clearCookie('invalid name');
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(KoriCookieError);
        const ke = e as KoriCookieError;
        expect(ke.cookieError.type).toBe('INVALID_NAME');
        expect(ke.code).toBe('COOKIE_ERROR');
      }
    });

    test('built response contains aggregated set-cookie header', () => {
      const res = createKoriResponse(mockReq);
      res.setCookie('a', '1');
      res.setCookie('b', '2');
      const built = res.build();
      const header = built.headers.get('set-cookie');
      expect(header).toBeTruthy();
      if (header) {
        expect(header.includes('a=1')).toBe(true);
        expect(header.includes('b=2')).toBe(true);
      }
    });
  });

  test('cookie names are case-sensitive (A vs a)', () => {
    const res = createKoriResponse(mockReq);
    res.setCookie('A', '1');
    res.setCookie('a', '2');

    const headerPre = res.getHeader('set-cookie');
    expect(headerPre).toBeTruthy();
    if (headerPre) {
      expect(headerPre.includes('A=1')).toBe(true);
      expect(headerPre.includes('a=2')).toBe(true);
    }

    const built = res.build();
    const header = built.headers.get('set-cookie');
    expect(header).toBeTruthy();
    if (header) {
      expect(header.includes('A=1')).toBe(true);
      expect(header.includes('a=2')).toBe(true);
    }
  });
});

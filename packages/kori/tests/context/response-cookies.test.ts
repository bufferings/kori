import { describe, test, expect } from 'vitest';

import { KoriError } from '../../src/error/index.js';

import { createKoriResponse } from '../../src/context/response.js';

describe('KoriResponse cookies contract', () => {
  describe('setCookie()', () => {
    test('serializes attributes into Set-Cookie header', () => {
      const res = createKoriResponse();
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
      const res = createKoriResponse();
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
      const res = createKoriResponse();
      res.setCookie('msg', 'hello world');
      const built = res.build();
      const header = built.headers.get('set-cookie');
      expect(header).toBeTruthy();
      if (header) {
        expect(header.includes('msg=hello%20world')).toBe(true);
      }
    });

    test("getHeader('set-cookie') aggregates multiple cookies before build", () => {
      const res = createKoriResponse();
      res.setCookie('a', '1');
      res.setCookie('b', '2');
      const header = res.getHeader('set-cookie');
      expect(header).toBeTruthy();
      if (header) {
        expect(header.includes('a=1')).toBe(true);
        expect(header.includes('b=2')).toBe(true);
      }
    });

    test('throws KoriError for invalid name with structured error', () => {
      const res = createKoriResponse();
      let caughtError: unknown;
      try {
        res.setCookie('invalid name', 'x');
      } catch (e) {
        caughtError = e;
      }
      expect(caughtError).toBeDefined();
      expect(caughtError).toBeInstanceOf(KoriError);
      const ke = caughtError as KoriError;
      expect(ke.code).toBe('COOKIE_ERROR');
      expect(ke.data).toBeDefined();
      const cookieFailure = (ke.data as { cookieFailure: { type: string; message: string } }).cookieFailure;
      expect(cookieFailure.type).toBe('INVALID_NAME');
      expect(cookieFailure.message).toContain('Invalid');
    });

    test('enforces __Secure- prefix secure constraint with structured error', () => {
      const res = createKoriResponse();
      let caughtError: unknown;
      try {
        res.setCookie('__Secure-token', 'x');
      } catch (e) {
        caughtError = e;
      }
      expect(caughtError).toBeDefined();
      expect(caughtError).toBeInstanceOf(KoriError);
      const ke = caughtError as KoriError;
      const cookieFailure = (ke.data as { cookieFailure: { type: string; prefix?: string; required?: string } })
        .cookieFailure;
      expect(cookieFailure.type).toBe('PREFIX_VIOLATION');
      if (cookieFailure.type === 'PREFIX_VIOLATION') {
        expect(cookieFailure.prefix).toBe('__Secure-');
        expect(cookieFailure.required).toBe('secure: true');
      }
    });

    test('enforces __Host- prefix path/domain/secure constraints with structured error', () => {
      const res = createKoriResponse();

      // missing secure
      let caughtError1: unknown;
      try {
        res.setCookie('__Host-session', 'v', { path: '/' } as any);
      } catch (e) {
        caughtError1 = e;
      }
      expect(caughtError1).toBeDefined();
      expect(caughtError1).toBeInstanceOf(KoriError);
      const ke1 = caughtError1 as KoriError;
      const cookieFailure1 = (ke1.data as { cookieFailure: { type: string; prefix?: string; required?: string } })
        .cookieFailure;
      expect(cookieFailure1.type).toBe('PREFIX_VIOLATION');
      expect(cookieFailure1.prefix).toBe('__Host-');
      expect(cookieFailure1.required).toBe('secure: true');

      // wrong path
      let caughtError2: unknown;
      try {
        res.setCookie('__Host-session', 'v', { secure: true, path: '/admin' } as any);
      } catch (e) {
        caughtError2 = e;
      }
      expect(caughtError2).toBeDefined();
      expect(caughtError2).toBeInstanceOf(KoriError);
      const ke2 = caughtError2 as KoriError;
      const cookieFailure2 = (ke2.data as { cookieFailure: { type: string; prefix?: string; required?: string } })
        .cookieFailure;
      expect(cookieFailure2.type).toBe('PREFIX_VIOLATION');
      expect(cookieFailure2.prefix).toBe('__Host-');
      expect(cookieFailure2.required).toBe('path: "/"');

      // domain not allowed
      let caughtError3: unknown;
      try {
        res.setCookie('__Host-session', 'v', { secure: true, path: '/', domain: 'example.com' } as any);
      } catch (e) {
        caughtError3 = e;
      }
      expect(caughtError3).toBeDefined();
      expect(caughtError3).toBeInstanceOf(KoriError);
      const ke3 = caughtError3 as KoriError;
      const cookieFailure3 = (ke3.data as { cookieFailure: { type: string; prefix?: string; required?: string } })
        .cookieFailure;
      expect(cookieFailure3.type).toBe('PREFIX_VIOLATION');
      expect(cookieFailure3.prefix).toBe('__Host-');
      expect(cookieFailure3.required).toBe('no domain attribute');
    });

    test('AGE_LIMIT_EXCEEDED when maxAge > 400 days', () => {
      const res = createKoriResponse();
      let caughtError: unknown;
      try {
        res.setCookie('a', 'b', { maxAge: 34560001 });
      } catch (e) {
        caughtError = e;
      }
      expect(caughtError).toBeDefined();
      expect(caughtError).toBeInstanceOf(KoriError);
      const ke = caughtError as KoriError;
      const cookieFailure = (ke.data as { cookieFailure: { type: string } }).cookieFailure;
      expect(cookieFailure.type).toBe('AGE_LIMIT_EXCEEDED');
    });

    test('EXPIRES_LIMIT_EXCEEDED when expires > 400 days', () => {
      const res = createKoriResponse();
      let caughtError: unknown;
      try {
        const expires = new Date(Date.now() + 401 * 24 * 60 * 60 * 1000);
        res.setCookie('a', 'b', { expires });
      } catch (e) {
        caughtError = e;
      }
      expect(caughtError).toBeDefined();
      expect(caughtError).toBeInstanceOf(KoriError);
      const ke = caughtError as KoriError;
      const cookieFailure = (ke.data as { cookieFailure: { type: string } }).cookieFailure;
      expect(cookieFailure.type).toBe('EXPIRES_LIMIT_EXCEEDED');
    });

    test('PARTITIONED_REQUIRES_SECURE when partitioned without secure', () => {
      const res = createKoriResponse();
      let caughtError: unknown;
      try {
        res.setCookie('sid', 'v', { partitioned: true } as any);
      } catch (e) {
        caughtError = e;
      }
      expect(caughtError).toBeDefined();
      expect(caughtError).toBeInstanceOf(KoriError);
      const ke = caughtError as KoriError;
      const cookieFailure = (ke.data as { cookieFailure: { type: string } }).cookieFailure;
      expect(cookieFailure.type).toBe('PARTITIONED_REQUIRES_SECURE');
    });

    test('SAMESITE_NONE_REQUIRES_SECURE when SameSite=None without secure', () => {
      const res = createKoriResponse();
      let caughtError: unknown;
      try {
        res.setCookie('sid', 'v', { sameSite: 'none' } as any);
      } catch (e) {
        caughtError = e;
      }
      expect(caughtError).toBeDefined();
      expect(caughtError).toBeInstanceOf(KoriError);
      const ke = caughtError as KoriError;
      const cookieFailure = (ke.data as { cookieFailure: { type: string } }).cookieFailure;
      expect(cookieFailure.type).toBe('SAMESITE_NONE_REQUIRES_SECURE');
    });

    test('PARTITIONED_REQUIRES_SAMESITE_NONE when partitioned without SameSite=None', () => {
      const res = createKoriResponse();
      let caughtError: unknown;
      try {
        res.setCookie('sid', 'v', { partitioned: true, secure: true, sameSite: 'lax' } as any);
      } catch (e) {
        caughtError = e;
      }
      expect(caughtError).toBeDefined();
      expect(caughtError).toBeInstanceOf(KoriError);
      const ke = caughtError as KoriError;
      const cookieFailure = (ke.data as { cookieFailure: { type: string } }).cookieFailure;
      expect(cookieFailure.type).toBe('PARTITIONED_REQUIRES_SAMESITE_NONE');
    });

    test('SERIALIZE_ERROR when encodeURIComponent throws', () => {
      const res = createKoriResponse();
      let caughtError: unknown;
      try {
        // Unpaired high surrogate causes encodeURIComponent to throw
        res.setCookie('bad', '\uD800');
      } catch (e) {
        caughtError = e;
      }
      expect(caughtError).toBeDefined();
      expect(caughtError).toBeInstanceOf(KoriError);
      const ke = caughtError as KoriError;
      const cookieFailure = (ke.data as { cookieFailure: { type: string } }).cookieFailure;
      expect(cookieFailure.type).toBe('SERIALIZE_ERROR');
    });
  });

  describe('clearCookie()', () => {
    test('serializes deletion with scope', () => {
      const res = createKoriResponse();
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

    test('throws KoriError for invalid name with structured error', () => {
      const res = createKoriResponse();
      let caughtError: unknown;
      try {
        res.clearCookie('invalid name');
      } catch (e) {
        caughtError = e;
      }
      expect(caughtError).toBeDefined();
      expect(caughtError).toBeInstanceOf(KoriError);
      const ke = caughtError as KoriError;
      const cookieFailure = (ke.data as { cookieFailure: { type: string } }).cookieFailure;
      expect(cookieFailure.type).toBe('INVALID_NAME');
      expect(ke.code).toBe('COOKIE_ERROR');
    });

    test('built response contains aggregated set-cookie header', () => {
      const res = createKoriResponse();
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
    const res = createKoriResponse();
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

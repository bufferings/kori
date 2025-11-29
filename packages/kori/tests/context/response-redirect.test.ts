import { describe, test, expect } from 'vitest';

import { HttpStatus } from '../../src/http/index.js';

import { createKoriRequest } from '../../src/context/request.js';
import { createKoriResponse } from '../../src/context/response.js';

describe('response redirect', () => {
  function createRes() {
    const req = createKoriRequest({
      rawRequest: new Request('http://localhost/test'),
      pathParams: {},
      pathTemplate: '/test',
    });
    return createKoriResponse(req);
  }

  describe('redirect()', () => {
    test('redirects with default 302 status', () => {
      const res = createRes();

      res.redirect('/dashboard');

      const response = res.build();
      expect(response.status).toBe(HttpStatus.FOUND);
      expect(response.headers.get('location')).toBe('/dashboard');
      expect(response.body).toBeNull();
    });

    test('redirects with custom status code', () => {
      const res = createRes();

      res.redirect('/new-location', HttpStatus.MOVED_PERMANENTLY);

      const response = res.build();
      expect(response.status).toBe(HttpStatus.MOVED_PERMANENTLY);
      expect(response.headers.get('location')).toBe('/new-location');
      expect(response.body).toBeNull();
    });

    test('redirects with 303 See Other', () => {
      const res = createRes();

      res.redirect('/success', HttpStatus.SEE_OTHER);

      const response = res.build();
      expect(response.status).toBe(HttpStatus.SEE_OTHER);
      expect(response.headers.get('location')).toBe('/success');
    });

    test('redirects with 307 Temporary Redirect', () => {
      const res = createRes();

      res.redirect('/temp', HttpStatus.TEMPORARY_REDIRECT);

      const response = res.build();
      expect(response.status).toBe(HttpStatus.TEMPORARY_REDIRECT);
      expect(response.headers.get('location')).toBe('/temp');
    });

    test('redirects with 308 Permanent Redirect', () => {
      const res = createRes();

      res.redirect('/permanent', HttpStatus.PERMANENT_REDIRECT);

      const response = res.build();
      expect(response.status).toBe(HttpStatus.PERMANENT_REDIRECT);
      expect(response.headers.get('location')).toBe('/permanent');
    });

    test('redirects to absolute URL', () => {
      const res = createRes();

      res.redirect('https://example.com/page');

      const response = res.build();
      expect(response.status).toBe(HttpStatus.FOUND);
      expect(response.headers.get('location')).toBe('https://example.com/page');
    });

    test('redirects with query parameters', () => {
      const res = createRes();

      res.redirect('/search?q=hello&sort=date');

      const response = res.build();
      expect(response.headers.get('location')).toBe('/search?q=hello&sort=date');
    });

    test('supports method chaining', () => {
      const res = createRes();

      const result = res.redirect('/dashboard').setHeader('x-custom', 'value').setCookie('session', 'abc123');

      expect(result).toBe(res);

      const response = res.build();
      expect(response.status).toBe(HttpStatus.FOUND);
      expect(response.headers.get('location')).toBe('/dashboard');
      expect(response.headers.get('x-custom')).toBe('value');
      expect(response.headers.get('set-cookie')).toContain('session=abc123');
    });

    test('redirect overwrites previous body', () => {
      const res = createRes();

      res.json({ data: 'test' }).redirect('/new-location');

      const response = res.build();
      expect(response.status).toBe(HttpStatus.FOUND);
      expect(response.headers.get('location')).toBe('/new-location');
      expect(response.body).toBeNull();
    });

    test('subsequent body methods overwrite redirect body', () => {
      const res = createRes();

      res.redirect('/dashboard').json({ override: true });

      const response = res.build();
      expect(response.status).toBe(HttpStatus.FOUND);
      expect(response.headers.get('location')).toBe('/dashboard');
      expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    });
  });
});

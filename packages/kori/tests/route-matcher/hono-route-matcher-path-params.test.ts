import { describe, test, expect, beforeEach } from 'vitest';

import { createHonoRouteMatcher, type KoriCompiledRouteMatcher } from '../../src/route-matcher/index.js';

function createRequest(url: string, method: string): Request {
  return new Request(url, { method });
}

function routeId(label: string): symbol {
  return Symbol(label);
}

describe('HonoRouteMatcher path parameter handling', () => {
  describe('core parameter extraction', () => {
    test('multiple params are extracted by name', () => {
      const matcher = createHonoRouteMatcher();
      const id = routeId('multi');
      matcher.addRoute({ method: 'GET', path: '/teams/:team/users/:user', routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createRequest('https://example.com/teams/a/users/b', 'GET'));

      expect(match?.routeId).toBe(id);
      expect(match?.pathParams).toEqual({ team: 'a', user: 'b' });
    });

    test('no params yields empty object', () => {
      const matcher = createHonoRouteMatcher();
      const id = routeId('none');
      matcher.addRoute({ method: 'GET', path: '/health', routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createRequest('https://example.com/health', 'GET'));

      expect(match?.routeId).toBe(id);
      expect(match?.pathParams).toEqual({});
    });

    test('matches path ignoring query string', () => {
      const matcher = createHonoRouteMatcher();
      const id = routeId('query');
      matcher.addRoute({ method: 'GET', path: '/search/:q', routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createRequest('https://example.com/search/abc?query=zzz', 'GET'));
      expect(match?.routeId).toBe(id);
      expect(match?.pathParams).toEqual({ q: 'abc' });
    });

    test('handles URL-encoded path parameters', () => {
      const matcher = createHonoRouteMatcher();
      const id = routeId('encoded');
      matcher.addRoute({ method: 'GET', path: '/search/:q', routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createRequest('https://example.com/search/hello%20world', 'GET'));

      expect(match?.routeId).toBe(id);
      expect(match?.pathParams).toEqual({ q: 'hello world' });
    });
  });

  describe('optional parameters', () => {
    test('optional param matches with and without value', () => {
      const matcher = createHonoRouteMatcher();
      const id = routeId('optional');
      matcher.addRoute({ method: 'GET', path: '/api/animal/:type?', routeId: id });

      const compiled = matcher.compile();

      const match1 = compiled(createRequest('https://example.com/api/animal', 'GET'));
      expect(match1?.routeId).toBe(id);
      expect(match1?.pathParams).toEqual({});

      const match2 = compiled(createRequest('https://example.com/api/animal/cat', 'GET'));
      expect(match2?.routeId).toBe(id);
      expect(match2?.pathParams).toEqual({ type: 'cat' });
    });
  });

  describe('regex constraints', () => {
    test('regexp param validates and captures values', () => {
      const matcher = createHonoRouteMatcher();
      const id = routeId('regexp');
      matcher.addRoute({ method: 'GET', path: '/post/:date{[0-9]+}/:title{[a-z]+}', routeId: id });

      const compiled = matcher.compile();

      const match = compiled(createRequest('https://example.com/post/20240101/hello', 'GET'));
      expect(match?.routeId).toBe(id);
      expect(match?.pathParams).toEqual({ date: '20240101', title: 'hello' });
    });

    test('regexp param captures slashes', () => {
      const matcher = createHonoRouteMatcher();
      const id = routeId('slashes');
      matcher.addRoute({ method: 'GET', path: '/posts/:filename{.+\\.png}', routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createRequest('https://example.com/posts/folder/img.png', 'GET'));
      expect(match?.routeId).toBe(id);
      expect(match?.pathParams).toEqual({ filename: 'folder/img.png' });
    });

    test('regex allowing empty string - /:param{.*}', () => {
      const matcher = createHonoRouteMatcher();
      const id = routeId('empty-regex');
      matcher.addRoute({ method: 'GET', path: '/:param{.*}', routeId: id });

      const compiled = matcher.compile();

      // Test empty string case
      const emptyMatch = compiled(createRequest('https://example.com/', 'GET'));
      expect(emptyMatch?.routeId).toBe(id);
      expect(emptyMatch?.pathParams).toEqual({ param: '' });

      // Test with value
      const valueMatch = compiled(createRequest('https://example.com/hello', 'GET'));
      expect(valueMatch?.routeId).toBe(id);
      expect(valueMatch?.pathParams).toEqual({ param: 'hello' });
    });

    describe('regex in middle segment allowing empty string', () => {
      let compiled: KoriCompiledRouteMatcher;
      let id: symbol;

      beforeEach(() => {
        const matcher = createHonoRouteMatcher();
        id = routeId('middle-empty-regex');
        matcher.addRoute({ method: 'GET', path: '/api/:version{.*}/users', routeId: id });
        compiled = matcher.compile();
      });

      test('matches normal case', () => {
        const match = compiled(createRequest('https://example.com/api/v1/users', 'GET'));
        expect(match?.routeId).toBe(id);
        expect(match?.pathParams).toEqual({ version: 'v1' });
      });

      test('matches empty string case', () => {
        const match = compiled(createRequest('https://example.com/api//users', 'GET'));
        expect(match?.routeId).toBe(id);
        expect(match?.pathParams).toEqual({ version: '' });
      });

      test('does not match missing segment', () => {
        const match = compiled(createRequest('https://example.com/api/users', 'GET'));
        expect(match).toBeUndefined();
      });
    });
  });

  describe('wildcard patterns', () => {
    describe('pattern "/wild/*/card"', () => {
      let compiled: KoriCompiledRouteMatcher;
      let id: symbol;

      beforeEach(() => {
        const matcher = createHonoRouteMatcher();
        id = routeId('wild-card');
        matcher.addRoute({ method: 'GET', path: '/wild/*/card', routeId: id });
        compiled = matcher.compile();
      });

      test('matches with segment present', () => {
        const match = compiled(createRequest('https://example.com/wild/anything/card', 'GET'));
        expect(match?.routeId).toBe(id);
        expect(match?.pathParams).toEqual({});
      });

      test('does not match with empty segment', () => {
        const match = compiled(createRequest('https://example.com/wild//card', 'GET'));
        expect(match).toBeUndefined();
      });

      test('does not match without wildcard segment', () => {
        const match = compiled(createRequest('https://example.com/wild/card', 'GET'));
        expect(match).toBeUndefined();
      });

      test('does not match multiple segments', () => {
        const match = compiled(createRequest('https://example.com/wild/v1/v2/card', 'GET'));
        expect(match).toBeUndefined();
      });
    });

    test('multiple wildcards in different positions', () => {
      const matcher = createHonoRouteMatcher();
      const id = routeId('multi-wild');
      matcher.addRoute({ method: 'GET', path: '/*/files/*/download', routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createRequest('https://example.com/user/files/image/download', 'GET'));

      expect(match?.routeId).toBe(id);
      expect(match?.pathParams).toEqual({});
    });

    describe('pattern "/files/*" catch-all', () => {
      let compiled: KoriCompiledRouteMatcher;
      let id: symbol;

      beforeEach(() => {
        const matcher = createHonoRouteMatcher();
        id = routeId('catchall');
        matcher.addRoute({ method: 'GET', path: '/files/*', routeId: id });
        compiled = matcher.compile();
      });

      test('matches nested paths', () => {
        const match1 = compiled(createRequest('https://example.com/files/a/b/c.txt', 'GET'));
        expect(match1?.routeId).toBe(id);

        const match2 = compiled(createRequest('https://example.com/files/deep/nested/file.png', 'GET'));
        expect(match2?.routeId).toBe(id);
      });

      test('matches empty path', () => {
        const emptyMatch = compiled(createRequest('https://example.com/files/', 'GET'));
        expect(emptyMatch?.routeId).toBe(id);
        expect(emptyMatch?.pathParams).toEqual({});
      });
    });
  });
});

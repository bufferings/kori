/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, test, expect } from 'vitest';

import { createHonoRouteMatcher } from '../../src/route-matcher/index.js';

function createRequest(url: string, method: string): Request {
  return new Request(url, { method });
}

function routeId(label: string): symbol {
  return Symbol(label);
}

describe('KoriRouteMatcher contract implemented by createHonoRouteMatcher', () => {
  describe('basic behavior', () => {
    test('added route is used after compile', () => {
      const matcher = createHonoRouteMatcher();
      const id = routeId('basic');
      matcher.addRoute({ method: 'GET', path: '/users/:id', routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createRequest('https://example.com/users/123', 'GET'))!;

      expect(match).toBeDefined();
      expect(match.routeId).toBe(id);
      expect(match.pathTemplate).toBe('/users/:id');
      expect(match.pathParams).toEqual({ id: '123' });
    });
  });

  describe('registration order', () => {
    test('earlier registration wins for identical method and path', () => {
      const matcher = createHonoRouteMatcher();
      const first = routeId('first');
      const second = routeId('second');
      matcher.addRoute({ method: 'GET', path: '/same', routeId: first });
      matcher.addRoute({ method: 'GET', path: '/same', routeId: second });

      const compiled = matcher.compile();
      const match = compiled(createRequest('https://example.com/same', 'GET'))!;

      expect(match.routeId).toBe(first);
    });

    test('specific route before param route wins', () => {
      const matcher = createHonoRouteMatcher();
      const specific = routeId('specific');
      const param = routeId('param');
      matcher.addRoute({ method: 'GET', path: '/book/a', routeId: specific });
      matcher.addRoute({ method: 'GET', path: '/book/:slug', routeId: param });

      const compiled = matcher.compile();
      const mA = compiled(createRequest('https://example.com/book/a', 'GET'))!;
      const mB = compiled(createRequest('https://example.com/book/b', 'GET'))!;
      expect(mA.routeId).toBe(specific);
      expect(mB.routeId).toBe(param);
    });

    test('if param route is added first, it captures unless specific added first', () => {
      const matcher = createHonoRouteMatcher();
      const param = routeId('param-first');
      const specific = routeId('specific-late');
      matcher.addRoute({ method: 'GET', path: '/book/:slug', routeId: param });
      matcher.addRoute({ method: 'GET', path: '/book/a', routeId: specific });

      const compiled = matcher.compile();
      const mA = compiled(createRequest('https://example.com/book/a', 'GET'))!;
      const mB = compiled(createRequest('https://example.com/book/b', 'GET'))!;
      // Hono executes in registration order, so param-first captures '/book/a'
      expect(mA.routeId).toBe(param);
      expect(mB.routeId).toBe(param);
    });
  });

  describe('method matching', () => {
    test('case-insensitive (lowercase add, uppercase request)', () => {
      const matcher = createHonoRouteMatcher();
      const id = routeId('method');
      matcher.addRoute({ method: 'get', path: '/cases/one', routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createRequest('https://example.com/cases/one', 'GET'))!;

      expect(match.routeId).toBe(id);
    });

    test('case-insensitive (uppercase add, lowercase request)', () => {
      const matcher = createHonoRouteMatcher();
      const id = routeId('method2');
      matcher.addRoute({ method: 'GET', path: '/cases/two', routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createRequest('https://example.com/cases/two', 'get'))!;

      expect(match.routeId).toBe(id);
    });
  });

  describe('path params', () => {
    test('multiple params are extracted by name', () => {
      const matcher = createHonoRouteMatcher();
      const id = routeId('multi');
      matcher.addRoute({ method: 'GET', path: '/teams/:team/users/:user', routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createRequest('https://example.com/teams/a/users/b', 'GET'))!;

      expect(match.routeId).toBe(id);
      expect(match.pathParams).toEqual({ team: 'a', user: 'b' });
    });

    test('no params yields empty object', () => {
      const matcher = createHonoRouteMatcher();
      const id = routeId('none');
      matcher.addRoute({ method: 'GET', path: '/health', routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createRequest('https://example.com/health', 'GET'))!;

      expect(match.routeId).toBe(id);
      expect(match.pathParams).toEqual({});
    });

    test('optional param: matches with and without the param', () => {
      const matcher = createHonoRouteMatcher();
      const id = routeId('optional');
      matcher.addRoute({ method: 'GET', path: '/api/animal/:type?', routeId: id });

      const compiled = matcher.compile();

      const match1 = compiled(createRequest('https://example.com/api/animal', 'GET'))!;
      expect(match1.routeId).toBe(id);
      expect(match1.pathParams).toEqual({});

      const match2 = compiled(createRequest('https://example.com/api/animal/cat', 'GET'))!;
      expect(match2.routeId).toBe(id);
      expect(match2.pathParams).toEqual({ type: 'cat' });
    });

    test('regexp param: enforces and captures values', () => {
      const matcher = createHonoRouteMatcher();
      const id = routeId('regexp');
      matcher.addRoute({ method: 'GET', path: '/post/:date{[0-9]+}/:title{[a-z]+}', routeId: id });

      const compiled = matcher.compile();

      const ok = compiled(createRequest('https://example.com/post/20240101/hello', 'GET'))!;
      expect(ok.routeId).toBe(id);
      expect(ok.pathParams).toEqual({ date: '20240101', title: 'hello' });
    });

    test('including slashes in param via regexp', () => {
      const matcher = createHonoRouteMatcher();
      const id = routeId('slashes');
      matcher.addRoute({ method: 'GET', path: '/posts/:filename{.+\\.png}', routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createRequest('https://example.com/posts/folder/img.png', 'GET'))!;
      expect(match.routeId).toBe(id);
      expect(match.pathParams).toEqual({ filename: 'folder/img.png' });
    });

    test('wildcard route matches path', () => {
      const matcher = createHonoRouteMatcher();
      const id = routeId('wild');
      matcher.addRoute({ method: 'GET', path: '/wild/*/card', routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createRequest('https://example.com/wild/anything/card', 'GET'))!;
      expect(match.routeId).toBe(id);
      // Wildcard is not a named param, no entries expected
      expect(match.pathParams).toEqual({});
    });

    test('matches path ignoring query string', () => {
      const matcher = createHonoRouteMatcher();
      const id = routeId('query');
      matcher.addRoute({ method: 'GET', path: '/search/:q', routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createRequest('https://example.com/search/abc?q=zzz', 'GET'))!;
      expect(match.routeId).toBe(id);
      expect(match.pathParams).toEqual({ q: 'abc' });
    });
  });

  describe('custom and multiple methods', () => {
    test('custom method works (PURGE)', () => {
      const matcher = createHonoRouteMatcher();
      const id = routeId('purge');
      matcher.addRoute({ method: 'PURGE', path: '/cache', routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createRequest('https://example.com/cache', 'purge'))!;
      expect(match.routeId).toBe(id);
    });

    test('multiple methods on same path behave independently', () => {
      const matcher = createHonoRouteMatcher();
      const putId = routeId('put');
      const delId = routeId('del');
      matcher.addRoute({ method: 'PUT', path: '/post', routeId: putId });
      matcher.addRoute({ method: 'DELETE', path: '/post', routeId: delId });

      const compiled = matcher.compile();
      const m1 = compiled(createRequest('https://example.com/post', 'PUT'))!;
      const m2 = compiled(createRequest('https://example.com/post', 'DELETE'))!;
      expect(m1.routeId).toBe(putId);
      expect(m2.routeId).toBe(delId);
    });
  });
});

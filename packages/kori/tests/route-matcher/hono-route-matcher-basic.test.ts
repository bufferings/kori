import { describe, test, expect } from 'vitest';

import { createHonoRouteMatcher } from '../../src/route-matcher/index.js';

function createRequest(url: string, method: string): Request {
  return new Request(url, { method });
}

function routeId(label: string): symbol {
  return Symbol(label);
}

describe('HonoRouteMatcher basic behavior', () => {
  describe('basic route compilation and matching', () => {
    test('returns matched route for exact path', () => {
      const matcher = createHonoRouteMatcher();
      const id = routeId('basic');
      matcher.addRoute({ method: 'GET', path: '/hello', routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createRequest('https://example.com/hello', 'GET'));

      expect(match?.routeId).toBe(id);
    });

    test('returns matched route and extracts path parameters', () => {
      const matcher = createHonoRouteMatcher();
      const id = routeId('basic');
      matcher.addRoute({ method: 'GET', path: '/users/:id', routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createRequest('https://example.com/users/123', 'GET'));

      expect(match?.routeId).toBe(id);
      expect(match?.pathParams).toEqual({ id: '123' });
    });
  });

  describe('method matching', () => {
    test('matches methods case-insensitively', () => {
      const matcher = createHonoRouteMatcher();
      const lowerId = routeId('lower');
      const upperId = routeId('upper');
      matcher.addRoute({ method: 'get', path: '/cases/lower', routeId: lowerId });
      matcher.addRoute({ method: 'POST', path: '/cases/upper', routeId: upperId });

      const compiled = matcher.compile();

      const lowerMatch = compiled(createRequest('https://example.com/cases/lower', 'GET'));
      expect(lowerMatch?.routeId).toBe(lowerId);

      const upperMatch = compiled(createRequest('https://example.com/cases/upper', 'post'));
      expect(upperMatch?.routeId).toBe(upperId);
    });

    test('supports custom HTTP methods', () => {
      const matcher = createHonoRouteMatcher();
      const id = routeId('purge');
      matcher.addRoute({ method: 'PURGE', path: '/cache', routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createRequest('https://example.com/cache', 'purge'));
      expect(match?.routeId).toBe(id);
    });

    test('multiple methods on same path work independently', () => {
      const matcher = createHonoRouteMatcher();
      const putId = routeId('put');
      const delId = routeId('del');
      matcher.addRoute({ method: 'PUT', path: '/post', routeId: putId });
      matcher.addRoute({ method: 'DELETE', path: '/post', routeId: delId });

      const compiled = matcher.compile();
      const putMatch = compiled(createRequest('https://example.com/post', 'PUT'));
      const deleteMatch = compiled(createRequest('https://example.com/post', 'DELETE'));
      expect(putMatch?.routeId).toBe(putId);
      expect(deleteMatch?.routeId).toBe(delId);
    });
  });

  describe('no match cases', () => {
    test('returns undefined for unmatched path', () => {
      const matcher = createHonoRouteMatcher();
      matcher.addRoute({ method: 'GET', path: '/users', routeId: routeId('users') });

      const compiled = matcher.compile();
      const match = compiled(createRequest('https://example.com/posts', 'GET'));

      expect(match).toBeUndefined();
    });

    test('returns undefined for unmatched method', () => {
      const matcher = createHonoRouteMatcher();
      matcher.addRoute({ method: 'GET', path: '/users', routeId: routeId('get-users') });

      const compiled = matcher.compile();
      const match = compiled(createRequest('https://example.com/users', 'POST'));

      expect(match).toBeUndefined();
    });

    test('returns undefined for regexp param mismatch', () => {
      const matcher = createHonoRouteMatcher();
      matcher.addRoute({ method: 'GET', path: '/post/:id{[0-9]+}', routeId: routeId('numeric') });

      const compiled = matcher.compile();
      const match = compiled(createRequest('https://example.com/post/abc', 'GET'));

      expect(match).toBeUndefined();
    });
  });
});

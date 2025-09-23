import { describe, test, expect, beforeEach } from 'vitest';

import { createHonoRouteMatcher, type KoriCompiledRouteMatcher } from '../../src/route-matcher/index.js';

function createRequest(url: string, method: string): Request {
  return new Request(url, { method });
}

function routeId(label: string): symbol {
  return Symbol(label);
}

describe('HonoRouteMatcher trailing slash behavior', () => {
  describe('basic behavior', () => {
    describe('pattern "/users" - strict matching (no trailing slash)', () => {
      let compiled: KoriCompiledRouteMatcher;
      let id: symbol;

      beforeEach(() => {
        const matcher = createHonoRouteMatcher();
        id = routeId('users-no-slash');
        matcher.addRoute({ method: 'GET', path: '/users', routeId: id });
        compiled = matcher.compile();
      });

      test('matches "/users" exactly', () => {
        const match = compiled(createRequest('https://example.com/users', 'GET'));
        expect(match?.routeId).toBe(id);
      });

      test('does not match "/users/"', () => {
        const match = compiled(createRequest('https://example.com/users/', 'GET'));
        expect(match).toBeUndefined();
      });
    });

    describe('pattern "/users/" - strict matching (requires trailing slash)', () => {
      let compiled: KoriCompiledRouteMatcher;
      let id: symbol;

      beforeEach(() => {
        const matcher = createHonoRouteMatcher();
        id = routeId('users-with-slash');
        matcher.addRoute({ method: 'GET', path: '/users/', routeId: id });
        compiled = matcher.compile();
      });

      test('matches "/users/" exactly', () => {
        const match = compiled(createRequest('https://example.com/users/', 'GET'));
        expect(match?.routeId).toBe(id);
      });

      test('does not match "/users"', () => {
        const match = compiled(createRequest('https://example.com/users', 'GET'));
        expect(match).toBeUndefined();
      });
    });

    describe('root pattern "/" - slash tolerant matching', () => {
      let compiled: KoriCompiledRouteMatcher;
      let id: symbol;

      beforeEach(() => {
        const matcher = createHonoRouteMatcher();
        id = routeId('root-slash');
        matcher.addRoute({ method: 'GET', path: '/', routeId: id });
        compiled = matcher.compile();
      });

      test('matches "/" URL', () => {
        const match = compiled(createRequest('https://example.com/', 'GET'));
        expect(match?.routeId).toBe(id);
      });

      test('matches "" URL (special case)', () => {
        const match = compiled(createRequest('https://example.com', 'GET'));
        expect(match?.routeId).toBe(id);
      });
    });

    describe('empty pattern "" does not match anything', () => {
      let compiled: KoriCompiledRouteMatcher;

      beforeEach(() => {
        const matcher = createHonoRouteMatcher();
        const id = routeId('empty');
        matcher.addRoute({ method: 'GET', path: '', routeId: id });
        compiled = matcher.compile();
      });

      test('does not match "/" URL', () => {
        const match = compiled(createRequest('https://example.com/', 'GET'));
        expect(match).toBeUndefined();
      });

      test('does not match "" URL', () => {
        const match = compiled(createRequest('https://example.com', 'GET'));
        expect(match).toBeUndefined();
      });
    });
  });

  describe('optional parameter behavior', () => {
    describe('pattern "/api/:version?" - no trailing slash tolerance', () => {
      let compiled: KoriCompiledRouteMatcher;
      let id: symbol;

      beforeEach(() => {
        const matcher = createHonoRouteMatcher();
        id = routeId('optional-trailing');
        matcher.addRoute({ method: 'GET', path: '/api/:version?', routeId: id });
        compiled = matcher.compile();
      });

      test('matches "/api/v1" with parameter', () => {
        const match = compiled(createRequest('https://example.com/api/v1', 'GET'));
        expect(match?.routeId).toBe(id);
        expect(match?.pathParams).toEqual({ version: 'v1' });
      });

      test('does not match "/api/v1/" with trailing slash', () => {
        const match = compiled(createRequest('https://example.com/api/v1/', 'GET'));
        expect(match).toBeUndefined();
      });

      test('matches "/api" without parameter', () => {
        const match = compiled(createRequest('https://example.com/api', 'GET'));
        expect(match?.routeId).toBe(id);
        expect(match?.pathParams).toEqual({});
      });

      test('does not match "/api/" with trailing slash', () => {
        const match = compiled(createRequest('https://example.com/api/', 'GET'));
        expect(match).toBeUndefined();
      });
    });

    describe('pattern "/:version?" - strict matching (no trailing slash)', () => {
      let compiled: KoriCompiledRouteMatcher;
      let id: symbol;

      beforeEach(() => {
        const matcher = createHonoRouteMatcher();
        id = routeId('normal-with-slash');
        matcher.addRoute({ method: 'GET', path: '/:version?', routeId: id });
        compiled = matcher.compile();
      });

      test('matches "/v1"', () => {
        const match = compiled(createRequest('https://example.com/v1', 'GET'));
        expect(match?.routeId).toBe(id);
        expect(match?.pathParams).toEqual({ version: 'v1' });
      });

      test('does not match "/v1/"', () => {
        const match = compiled(createRequest('https://example.com/v1/', 'GET'));
        expect(match).toBeUndefined();
      });

      test('matches "/"', () => {
        const match = compiled(createRequest('https://example.com/', 'GET'));
        expect(match?.routeId).toBe(id);
        expect(match?.pathParams).toEqual({});
      });

      test('matches ""', () => {
        const match = compiled(createRequest('https://example.com', 'GET'));
        expect(match?.routeId).toBe(id);
        expect(match?.pathParams).toEqual({});
      });
    });

    describe('pattern ":version?" - no leading slash (caution: unexpected behavior)', () => {
      let compiled: KoriCompiledRouteMatcher;
      let id: symbol;

      beforeEach(() => {
        const matcher = createHonoRouteMatcher();
        id = routeId('normal-without-slash');
        matcher.addRoute({ method: 'GET', path: ':version?', routeId: id });
        compiled = matcher.compile();
      });

      test('matches "/v1" - caution: matches but parameter not extracted', () => {
        const match = compiled(createRequest('https://example.com/v1', 'GET'));
        expect(match?.routeId).toBe(id);
        expect(match?.pathParams).toEqual({});
      });

      test('does not match "/v1/"', () => {
        const match = compiled(createRequest('https://example.com/v1/', 'GET'));
        expect(match).toBeUndefined();
      });

      test('matches "/"', () => {
        const match = compiled(createRequest('https://example.com/', 'GET'));
        expect(match?.routeId).toBe(id);
        expect(match?.pathParams).toEqual({});
      });

      test('matches ""', () => {
        const match = compiled(createRequest('https://example.com', 'GET'));
        expect(match?.routeId).toBe(id);
        expect(match?.pathParams).toEqual({});
      });
    });
  });
});

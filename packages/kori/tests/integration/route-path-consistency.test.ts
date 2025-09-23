/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, test, expect, expectTypeOf } from 'vitest';

import { createHonoRouteMatcher } from '../../src/route-matcher/index.js';

import { type PathParams } from '../../src/routing/path-params.js';

function createTestRequest(url: string): Request {
  return new Request(url, { method: 'GET' });
}

function routeId(label: string): symbol {
  return Symbol(label);
}

describe('Route path consistency between matcher and types', () => {
  describe('Fixed paths', () => {
    test('/health - no parameters', () => {
      const path = '/health' as const;

      const matcher = createHonoRouteMatcher();
      const id = routeId('none');
      matcher.addRoute({ method: 'GET', path, routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createTestRequest('https://example.com/health'))!;

      expect(match.routeId).toBe(id);
      expect(match.pathParams).toEqual({});
      expectTypeOf<PathParams<typeof path>>().toEqualTypeOf<Record<never, never>>();
    });
  });

  describe('Single parameters', () => {
    test('/users/:id', () => {
      const path = '/users/:id' as const;

      const matcher = createHonoRouteMatcher();
      const id = routeId('single');
      matcher.addRoute({ method: 'GET', path, routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createTestRequest('https://example.com/users/123'))!;

      expect(match.routeId).toBe(id);
      expect(match.pathParams).toEqual({ id: '123' });
      expectTypeOf<PathParams<typeof path>>().toEqualTypeOf<{ id: string }>();
    });
  });

  describe('Multiple parameters', () => {
    test('/teams/:team/users/:user', () => {
      const path = '/teams/:team/users/:user' as const;

      const matcher = createHonoRouteMatcher();
      const id = routeId('multiple');
      matcher.addRoute({ method: 'GET', path, routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createTestRequest('https://example.com/teams/alpha/users/bob'))!;

      expect(match.routeId).toBe(id);
      expect(match.pathParams).toEqual({ team: 'alpha', user: 'bob' });
      expectTypeOf<PathParams<typeof path>>().toEqualTypeOf<{ team: string; user: string }>();
    });
  });

  describe('Wildcard patterns', () => {
    test('/files/* - catch-all wildcard', () => {
      const path = '/files/*' as const;

      const matcher = createHonoRouteMatcher();
      const id = routeId('wildcard');
      matcher.addRoute({ method: 'GET', path, routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createTestRequest('https://example.com/files/deep/nested/file.txt'))!;

      expect(match.routeId).toBe(id);
      expect(match.pathParams).toEqual({});
      expectTypeOf<PathParams<typeof path>>().toEqualTypeOf<Record<never, never>>();
    });
  });

  describe('Optional parameters', () => {
    test('/api/:version? - single optional parameter', () => {
      const path = '/api/:version?' as const;

      const matcher = createHonoRouteMatcher();
      const id = routeId('single-optional');
      matcher.addRoute({ method: 'GET', path, routeId: id });
      const compiled = matcher.compile();

      const withValue = compiled(createTestRequest('https://example.com/api/v1'))!;
      expect(withValue.routeId).toBe(id);
      expect(withValue.pathParams).toEqual({ version: 'v1' });

      const withoutValue = compiled(createTestRequest('https://example.com/api'))!;
      expect(withoutValue.routeId).toBe(id);
      expect(withoutValue.pathParams).toEqual({});

      expectTypeOf<PathParams<typeof path>>().toEqualTypeOf<{ version: string | undefined }>();
    });

    test('/users/:id/posts/:slug? - required + optional parameters', () => {
      const path = '/users/:id/posts/:slug?' as const;

      const matcher = createHonoRouteMatcher();
      const id = routeId('required-optional');
      matcher.addRoute({ method: 'GET', path, routeId: id });
      const compiled = matcher.compile();

      const withSlug = compiled(createTestRequest('https://example.com/users/123/posts/hello'))!;
      expect(withSlug.routeId).toBe(id);
      expect(withSlug.pathParams).toEqual({ id: '123', slug: 'hello' });

      const withoutSlug = compiled(createTestRequest('https://example.com/users/123/posts'))!;
      expect(withoutSlug.routeId).toBe(id);
      expect(withoutSlug.pathParams).toEqual({ id: '123' });

      expectTypeOf<PathParams<typeof path>>().toEqualTypeOf<{ id: string; slug: string | undefined }>();
    });

    test('/:version? - root level optional parameter', () => {
      const path = '/:version?' as const;

      const matcher = createHonoRouteMatcher();
      const id = routeId('root-optional');
      matcher.addRoute({ method: 'GET', path, routeId: id });
      const compiled = matcher.compile();

      const withValue = compiled(createTestRequest('https://example.com/v1'))!;
      expect(withValue.routeId).toBe(id);
      expect(withValue.pathParams).toEqual({ version: 'v1' });

      const withoutValue = compiled(createTestRequest('https://example.com'))!;
      expect(withoutValue.routeId).toBe(id);
      expect(withoutValue.pathParams).toEqual({});

      expectTypeOf<PathParams<typeof path>>().toEqualTypeOf<{ version: string | undefined }>();
    });

    test(':version? - no leading slash (caution: parameter not extracted)', () => {
      const path = ':version?' as const;

      const matcher = createHonoRouteMatcher();
      const id = routeId('root-optional');
      matcher.addRoute({ method: 'GET', path, routeId: id });
      const compiled = matcher.compile();

      // Test with parameter value - matches but parameter NOT extracted (Hono behavior)
      const withValue = compiled(createTestRequest('https://example.com/v1'))!;
      expect(withValue.routeId).toBe(id);
      expect(withValue.pathParams).toEqual({}); // No leading slash = no parameter extraction

      expectTypeOf<PathParams<typeof path>>().toEqualTypeOf<{ version: string | undefined }>();
    });
  });

  describe('Regex constraints', () => {
    test('/posts/:id{[0-9]+} - basic regex constraint', () => {
      const path = '/posts/:id{[0-9]+}' as const;

      const matcher = createHonoRouteMatcher();
      const id = routeId('basic-regex');
      matcher.addRoute({ method: 'GET', path, routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createTestRequest('https://example.com/posts/456'))!;

      expect(match.routeId).toBe(id);
      expect(match.pathParams).toEqual({ id: '456' });
      expectTypeOf<PathParams<typeof path>>().toEqualTypeOf<{ id: string }>();
    });

    test('/posts/:id{[0-9]+}? - constraint + optional', () => {
      const path = '/posts/:id{[0-9]+}?' as const;

      const matcher = createHonoRouteMatcher();
      const id = routeId('constraint-optional');
      matcher.addRoute({ method: 'GET', path, routeId: id });
      const compiled = matcher.compile();

      // Test both cases for constraint + optional
      const withValue = compiled(createTestRequest('https://example.com/posts/456'))!;
      expect(withValue.routeId).toBe(id);
      expect(withValue.pathParams).toEqual({ id: '456' });

      const withoutValue = compiled(createTestRequest('https://example.com/posts'))!;
      expect(withoutValue.routeId).toBe(id);
      expect(withoutValue.pathParams).toEqual({});

      expectTypeOf<PathParams<typeof path>>().toEqualTypeOf<{ id: string | undefined }>();
    });

    test('/files/:filename{.+\\.png} - complex regex constraint', () => {
      const path = '/files/:filename{.+\\.png}' as const;

      const matcher = createHonoRouteMatcher();
      const id = routeId('complex-regex');
      matcher.addRoute({ method: 'GET', path, routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createTestRequest('https://example.com/files/folder/image.png'))!;

      expect(match.routeId).toBe(id);
      expect(match.pathParams).toEqual({ filename: 'folder/image.png' });
      expectTypeOf<PathParams<typeof path>>().toEqualTypeOf<{ filename: string }>();
    });

    test('/files/:filename{.+\\.png}? - complex regex + optional', () => {
      const path = '/files/:filename{.+\\.png}?' as const;

      const matcher = createHonoRouteMatcher();
      const id = routeId('complex-regex-optional');
      matcher.addRoute({ method: 'GET', path, routeId: id });
      const compiled = matcher.compile();

      const withFile = compiled(createTestRequest('https://example.com/files/folder/image.png'))!;
      expect(withFile.routeId).toBe(id);
      expect(withFile.pathParams).toEqual({ filename: 'folder/image.png' });

      const withoutFile = compiled(createTestRequest('https://example.com/files'))!;
      expect(withoutFile.routeId).toBe(id);
      expect(withoutFile.pathParams).toEqual({});

      expectTypeOf<PathParams<typeof path>>().toEqualTypeOf<{ filename: string | undefined }>();
    });

    test('/users/:id{[0-9]+}/posts/:slug - constraint + regular', () => {
      const path = '/users/:id{[0-9]+}/posts/:slug' as const;

      const matcher = createHonoRouteMatcher();
      const id = routeId('constraint-regular');
      matcher.addRoute({ method: 'GET', path, routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createTestRequest('https://example.com/users/789/posts/hello'))!;

      expect(match.routeId).toBe(id);
      expect(match.pathParams).toEqual({ id: '789', slug: 'hello' });
      expectTypeOf<PathParams<typeof path>>().toEqualTypeOf<{ id: string; slug: string }>();
    });

    test('/api/:version/users/:id{[0-9]+} - regular + constraint', () => {
      const path = '/api/:version/users/:id{[0-9]+}' as const;

      const matcher = createHonoRouteMatcher();
      const id = routeId('regular-constraint');
      matcher.addRoute({ method: 'GET', path, routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createTestRequest('https://example.com/api/v2/users/789'))!;

      expect(match.routeId).toBe(id);
      expect(match.pathParams).toEqual({ version: 'v2', id: '789' });
      expectTypeOf<PathParams<typeof path>>().toEqualTypeOf<{ version: string; id: string }>();
    });

    test('/posts/:date{[0-9]+}/:title{[a-z]+} - multiple constraints', () => {
      const path = '/posts/:date{[0-9]+}/:title{[a-z]+}' as const;

      const matcher = createHonoRouteMatcher();
      const id = routeId('multiple-constraints');
      matcher.addRoute({ method: 'GET', path, routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createTestRequest('https://example.com/posts/20240101/hello'))!;

      expect(match.routeId).toBe(id);
      expect(match.pathParams).toEqual({ date: '20240101', title: 'hello' });
      expectTypeOf<PathParams<typeof path>>().toEqualTypeOf<{ date: string; title: string }>();
    });

    test('/files/:filename{.+\\.png} - complex regex', () => {
      const path = '/files/:filename{.+\\.png}' as const;

      const matcher = createHonoRouteMatcher();
      const id = routeId('complex-regex');
      matcher.addRoute({ method: 'GET', path, routeId: id });

      const compiled = matcher.compile();
      const match = compiled(createTestRequest('https://example.com/files/folder/image.png'))!;

      expect(match.routeId).toBe(id);
      expect(match.pathParams).toEqual({ filename: 'folder/image.png' });
      expectTypeOf<PathParams<typeof path>>().toEqualTypeOf<{ filename: string }>();
    });
  });
});

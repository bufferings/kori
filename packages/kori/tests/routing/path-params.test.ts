import { describe, test, expectTypeOf } from 'vitest';

import { type KoriRequest } from '../../src/context/index.js';

import { type PathParams, type WithPathParams } from '../../src/routing/path-params.js';

describe('PathParams type extraction', () => {
  test('extracts single parameter', () => {
    expectTypeOf<PathParams<'/users/:id'>>().toEqualTypeOf<{ id: string }>();
  });

  test('extracts multiple parameters', () => {
    expectTypeOf<PathParams<'/users/:userId/posts/:postId'>>().toEqualTypeOf<{
      userId: string;
      postId: string;
    }>();
  });

  test('handles optional parameters', () => {
    expectTypeOf<PathParams<'/api/:version?'>>().toEqualTypeOf<{ version: string | undefined }>();
    expectTypeOf<PathParams<'/posts/:slug/comments/:id?'>>().toEqualTypeOf<{
      slug: string;
      id: string | undefined;
    }>();
  });

  test('handles regex constraints', () => {
    expectTypeOf<PathParams<'/posts/:date{[0-9]+}'>>().toEqualTypeOf<{ date: string }>();
    expectTypeOf<PathParams<'/files/:filename{.+\\.png}'>>().toEqualTypeOf<{ filename: string }>();
  });

  test('handles regex with optional parameters', () => {
    expectTypeOf<PathParams<'/posts/:date{[0-9]+}?'>>().toEqualTypeOf<{ date: string | undefined }>();
    expectTypeOf<PathParams<'/api/:version{v[0-9]+}?/users/:id'>>().toEqualTypeOf<{
      version: string | undefined;
      id: string;
    }>();
  });

  test('handles mixed patterns', () => {
    expectTypeOf<PathParams<'/api/:version?/users/:id{[0-9]+}/posts/:slug?'>>().toEqualTypeOf<{
      version: string | undefined;
      id: string;
      slug: string | undefined;
    }>();
  });

  test('returns empty record for paths without parameters', () => {
    expectTypeOf<PathParams<'/health'>>().toEqualTypeOf<Record<never, never>>();
    expectTypeOf<PathParams<'/api/status'>>().toEqualTypeOf<Record<never, never>>();
  });

  test('handles string fallback for dynamic paths', () => {
    expectTypeOf<PathParams<string>>().toEqualTypeOf<Record<string, string>>();
  });
});

describe('WithPathParams request extension', () => {
  test('replaces pathParams method with typed version', () => {
    type ExtendedReq = WithPathParams<KoriRequest, '/users/:id'>;

    expectTypeOf<ExtendedReq['pathParams']>().toEqualTypeOf<() => { id: string }>();
  });

  test('preserves other request methods', () => {
    type ExtendedReq = WithPathParams<KoriRequest, '/users/:id'>;

    expectTypeOf<ExtendedReq['method']>().toEqualTypeOf<() => string>();
    expectTypeOf<ExtendedReq['url']>().toEqualTypeOf<() => URL>();
    expectTypeOf<ExtendedReq['headers']>().toEqualTypeOf<() => Record<string, string>>();
  });

  test('works with complex path patterns', () => {
    type ExtendedReq = WithPathParams<KoriRequest, '/teams/:team/users/:user{[a-z]+}'>;

    expectTypeOf<ExtendedReq['pathParams']>().toEqualTypeOf<
      () => {
        team: string;
        user: string;
      }
    >();
  });
});

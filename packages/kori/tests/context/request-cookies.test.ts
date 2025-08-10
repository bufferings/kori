import { describe, test, expect } from 'vitest';

import { createKoriRequest } from '../../src/context/request.js';

describe('KoriRequest cookies contract', () => {
  test('cookies/cookie normal', () => {
    const req = createKoriRequest({
      rawRequest: new Request('http://x', {
        headers: { cookie: 'a=1; b=hello' },
      }),
      pathParams: {},
      pathTemplate: '/',
    });

    expect(req.cookies()).toEqual({ a: '1', b: 'hello' });
    expect(req.cookie('a')).toBe('1');
    expect(req.cookie('none')).toBeUndefined();
  });

  test('lenient parsing skips malformed pairs and returns available cookies', () => {
    const req = createKoriRequest({
      rawRequest: new Request('http://x', {
        headers: { cookie: 'invalid; =token; a=1; b; c=3' },
      }),
      pathParams: {},
      pathTemplate: '/',
    });

    // malformed pairs are skipped; valid ones are present
    expect(req.cookies()).toEqual({ a: '1', c: '3' });
    expect(req.cookie('a')).toBe('1');
    expect(req.cookie('b')).toBeUndefined();
  });

  test('cookies() returns empty object when Cookie header is missing', () => {
    const req = createKoriRequest({
      rawRequest: new Request('http://x', {}),
      pathParams: {},
      pathTemplate: '/',
    });

    expect(req.cookies()).toEqual({});
  });

  test('cookie(name) returns undefined when Cookie header is missing', () => {
    const req = createKoriRequest({
      rawRequest: new Request('http://x', {}),
      pathParams: {},
      pathTemplate: '/',
    });

    expect(req.cookie('any')).toBeUndefined();
  });

  test('percent-decoding works for cookie values', () => {
    const req = createKoriRequest({
      rawRequest: new Request('http://x', {
        headers: { cookie: 'name=alice%20bob; token=%7Babc%7D' },
      }),
      pathParams: {},
      pathTemplate: '/',
    });

    expect(req.cookie('name')).toBe('alice bob');
    expect(req.cookie('token')).toBe('{abc}');
  });

  test('duplicate cookie keys keep the last value', () => {
    const req = createKoriRequest({
      rawRequest: new Request('http://x', {
        headers: { cookie: 'a=1; a=2; a=3' },
      }),
      pathParams: {},
      pathTemplate: '/',
    });

    expect(req.cookie('a')).toBe('3');
  });

  test('empty Cookie header yields empty cookies object', () => {
    const req = createKoriRequest({
      rawRequest: new Request('http://x', {
        headers: { cookie: '' },
      }),
      pathParams: {},
      pathTemplate: '/',
    });

    expect(req.cookies()).toEqual({});
  });
});

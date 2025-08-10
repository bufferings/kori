import { describe, test, expect } from 'vitest';

import { createKoriRequest } from '../../src/context/request.js';

describe('KoriRequest basics contract', () => {
  test('url() returns URL with path and query intact', () => {
    const rawRequest = new Request('http://localhost/users/123?tag=a&tag=b&single=1&encoded=e%40x');
    const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });

    const url = req.url();
    expect(url).toBeInstanceOf(URL);
    expect(url.origin).toBe('http://localhost');
    expect(url.pathname).toBe('/users/123');
    expect(url.search).toBe('?tag=a&tag=b&single=1&encoded=e%40x');
  });

  test('method() returns HTTP method', () => {
    const rawRequest = new Request('http://x', { method: 'POST' });
    const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });
    expect(req.method()).toBe('POST');
  });

  test('pathParams() returns given values', () => {
    const rawRequest = new Request('http://x/users/123');
    const req = createKoriRequest({ rawRequest, pathParams: { id: '123' }, pathTemplate: '/users/:id' });
    expect(req.pathParams()).toEqual({ id: '123' });
  });

  test('pathTemplate() returns the provided template string', () => {
    const rawRequest = new Request('http://x/users/123');
    const req = createKoriRequest({ rawRequest, pathParams: { id: '123' }, pathTemplate: '/users/:id' });
    expect(req.pathTemplate()).toBe('/users/:id');
  });

  test('queryParams() returns string for single and string[] for multiple values; values are decoded', () => {
    const rawRequest = new Request('http://x/search?q=hello&tags=a&tags=b&email=test%40example.com');
    const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });

    const qp = req.queryParams();
    expect(qp.q).toBe('hello');
    expect(qp.tags).toEqual(['a', 'b']);
    expect(qp.email).toBe('test@example.com');
  });

  test('queryParams() treats empty and key-only values as empty strings', () => {
    const rawRequest = new Request('http://x/search?a=&b');
    const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });

    const qp = req.queryParams();
    expect(qp.a).toBe('');
    expect(qp.b).toBe('');
    expect(qp.c).toBeUndefined();
  });

  test('raw() returns a Request whose url and method match the inputs', () => {
    const rawRequest = new Request('http://x/path?x=1', { method: 'PUT' });
    const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });
    const raw = req.raw();
    expect(raw).toBeInstanceOf(Request);
    expect(raw.url).toBe('http://x/path?x=1');
    expect(raw.method).toBe('PUT');
  });
});

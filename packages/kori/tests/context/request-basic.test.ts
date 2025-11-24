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

  test('param() returns specific path parameter value', () => {
    const rawRequest = new Request('http://x/users/123');
    const req = createKoriRequest({ rawRequest, pathParams: { id: '123' }, pathTemplate: '/users/:id' });
    expect(req.param('id')).toBe('123');
    expect(req.param('missing')).toBeUndefined();
  });

  test('params() returns all path parameters', () => {
    const rawRequest = new Request('http://x/users/123');
    const req = createKoriRequest({ rawRequest, pathParams: { id: '123' }, pathTemplate: '/users/:id' });
    expect(req.params()).toEqual({ id: '123' });
  });

  test('pathTemplate() returns the provided template string', () => {
    const rawRequest = new Request('http://x/users/123');
    const req = createKoriRequest({ rawRequest, pathParams: { id: '123' }, pathTemplate: '/users/:id' });
    expect(req.pathTemplate()).toBe('/users/:id');
  });

  test('queries() returns string for single and string[] for multiple values; values are decoded', () => {
    const rawRequest = new Request('http://x/search?q=hello&tags=a&tags=b&email=test%40example.com');
    const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });

    const qp = req.queries();
    expect(qp.q).toBe('hello');
    expect(qp.tags).toEqual(['a', 'b']);
    expect(qp.email).toBe('test@example.com');
  });

  test('queries() treats empty and key-only values as empty strings', () => {
    const rawRequest = new Request('http://x/search?a=&b');
    const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });

    const qp = req.queries();
    expect(qp.a).toBe('');
    expect(qp.b).toBe('');
    expect(qp.c).toBeUndefined();
  });

  describe('query()', () => {
    test('returns single value for parameter', () => {
      const rawRequest = new Request('http://x/search?q=hello&tags=a&tags=b');
      const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });

      expect(req.query('q')).toBe('hello');
      expect(req.query('tags')).toBe('a');
      expect(req.query('missing')).toBeUndefined();
    });

    test('decodes URL-encoded values', () => {
      const rawRequest = new Request('http://x/search?email=test%40example.com');
      const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });

      expect(req.query('email')).toBe('test@example.com');
    });

    test('handles empty and key-only values', () => {
      const rawRequest = new Request('http://x/search?a=&b');
      const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });

      expect(req.query('a')).toBe('');
      expect(req.query('b')).toBe('');
    });

    test('returns first value when multiple values exist', () => {
      const rawRequest = new Request('http://x/search?tags=a&tags=b&tags=c');
      const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });

      expect(req.query('tags')).toBe('a');
    });

    test('converts plus signs to spaces', () => {
      const rawRequest = new Request('http://x/search?q=hello+world');
      const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });

      expect(req.query('q')).toBe('hello world');
    });

    test('handles plus signs and percent encoding together', () => {
      const rawRequest = new Request('http://x/search?email=john+doe%40example.com');
      const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });

      expect(req.query('email')).toBe('john doe@example.com');
    });

    test('handles malformed percent encoding gracefully', () => {
      const rawRequest = new Request('http://x/search?value=%ZZ');
      const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });

      expect(req.query('value')).toBe('%ZZ');
    });

    test('decodes UTF-8 encoded query parameters', () => {
      const rawRequest = new Request('http://x/search?q=%E3%81%93%E3%82%93%E3%81%AB%E3%81%A1%E3%81%AF');
      const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });

      // eslint-disable-next-line kori/ascii-only-source
      expect(req.query('q')).toBe('こんにちは');
    });

    test('decodes complex URL-encoded values', () => {
      const rawRequest = new Request('http://x/search?url=https%3A%2F%2Fexample.com%2Fpath%3Fquery%3Dvalue');
      const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });

      expect(req.query('url')).toBe('https://example.com/path?query=value');
    });

    test('decodes JSON string in query parameter', () => {
      const rawRequest = new Request('http://x/search?data=%7B%22key%22%3A%22value%22%7D');
      const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });

      expect(req.query('data')).toBe('{"key":"value"}');
    });
  });

  describe('queryArray()', () => {
    test('returns all values for parameter', () => {
      const rawRequest = new Request('http://x/search?tags=a&tags=b&tags=c');
      const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });

      expect(req.queryArray('tags')).toEqual(['a', 'b', 'c']);
      expect(req.queryArray('missing')).toBeUndefined();
    });

    test('returns single element array for single value', () => {
      const rawRequest = new Request('http://x/search?q=hello');
      const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });

      expect(req.queryArray('q')).toEqual(['hello']);
    });

    test('handles empty and key-only values', () => {
      const rawRequest = new Request('http://x/search?a=&b');
      const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });

      expect(req.queryArray('a')).toEqual(['']);
      expect(req.queryArray('b')).toEqual(['']);
    });

    test('decodes URL-encoded array values', () => {
      const rawRequest = new Request('http://x/search?tags=tag%201&tags=tag%202');
      const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });

      expect(req.queryArray('tags')).toEqual(['tag 1', 'tag 2']);
    });

    test('converts plus signs to spaces in array values', () => {
      const rawRequest = new Request('http://x/search?items=item+1&items=item+2');
      const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });

      expect(req.queryArray('items')).toEqual(['item 1', 'item 2']);
    });

    test('handles mixed encoded and plain values', () => {
      const rawRequest = new Request('http://x/search?vals=plain&vals=encoded%20value&vals=with+plus');
      const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });

      expect(req.queryArray('vals')).toEqual(['plain', 'encoded value', 'with plus']);
    });

    test('handles empty values in array', () => {
      const rawRequest = new Request('http://x/search?vals=&vals=value&vals=');
      const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });

      expect(req.queryArray('vals')).toEqual(['', 'value', '']);
    });

    test('handles malformed percent encoding in array values', () => {
      const rawRequest = new Request('http://x/search?vals=good&vals=%ZZ&vals=also+good');
      const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });

      expect(req.queryArray('vals')).toEqual(['good', '%ZZ', 'also good']);
    });
  });

  test('raw() returns a Request whose url and method match the inputs', () => {
    const rawRequest = new Request('http://x/path?x=1', { method: 'PUT' });
    const req = createKoriRequest({ rawRequest, pathParams: {}, pathTemplate: '/' });
    const raw = req.raw();
    expect(raw).toBeInstanceOf(Request);
    expect(raw.url).toBe('http://x/path?x=1');
    expect(raw.method).toBe('PUT');
  });

  test('params() returns null-prototype object to prevent prototype pollution', () => {
    const rawRequest = new Request('http://x/users/123');
    const req = createKoriRequest({ rawRequest, pathParams: { id: '123' }, pathTemplate: '/users/:id' });
    const params = req.params();
    expect(Object.getPrototypeOf(params)).toBeNull();
    expect(params.constructor).toBeUndefined();
  });
});

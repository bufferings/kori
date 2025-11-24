import { describe, expect, test } from 'vitest';

import {
  decodeQueryValue,
  parseQueryParam,
  parseQueryParamArray,
  parseAllQueryParams,
} from '../../src/context/request-query.js';

describe('decodeQueryValue()', () => {
  test('returns plain string unchanged', () => {
    expect(decodeQueryValue('hello')).toBe('hello');
    expect(decodeQueryValue('world123')).toBe('world123');
  });

  test('converts plus signs to spaces', () => {
    expect(decodeQueryValue('hello+world')).toBe('hello world');
    expect(decodeQueryValue('one+two+three')).toBe('one two three');
  });

  test('decodes percent encoding', () => {
    expect(decodeQueryValue('hello%20world')).toBe('hello world');
    // eslint-disable-next-line kori/ascii-only-source
    expect(decodeQueryValue('%E3%81%93%E3%82%93%E3%81%AB%E3%81%A1%E3%81%AF')).toBe('こんにちは');
  });

  test('handles mixed plus and percent encoding', () => {
    expect(decodeQueryValue('hello+%20world')).toBe('hello  world');
    expect(decodeQueryValue('one+two%20three')).toBe('one two three');
  });

  test('handles malformed percent encoding gracefully', () => {
    expect(decodeQueryValue('%ZZ')).toBe('%ZZ');
    expect(decodeQueryValue('hello%ZZworld')).toBe('hello%ZZworld');
  });

  test('handles incomplete percent encoding (URIError case)', () => {
    expect(decodeQueryValue('%')).toBe('%');
    expect(decodeQueryValue('value%')).toBe('value%');
  });

  test('decodes complex URL-encoded values', () => {
    expect(decodeQueryValue('https%3A%2F%2Fexample.com')).toBe('https://example.com');
    expect(decodeQueryValue('%7B%22key%22%3A%22value%22%7D')).toBe('{"key":"value"}');
  });

  test('returns empty string unchanged', () => {
    expect(decodeQueryValue('')).toBe('');
  });

  test('handles special characters', () => {
    expect(decodeQueryValue('!@#$')).toBe('!@#$');
    expect(decodeQueryValue('a%2Bb')).toBe('a+b');
  });
});

describe('parseQueryParam()', () => {
  test('extracts single parameter', () => {
    expect(parseQueryParam('http://x/?q=hello', 'q')).toBe('hello');
    expect(parseQueryParam('http://x/path?name=value', 'name')).toBe('value');
  });

  test('returns undefined for missing parameter', () => {
    expect(parseQueryParam('http://x/?q=hello', 'missing')).toBeUndefined();
    expect(parseQueryParam('http://x/', 'q')).toBeUndefined();
  });

  test('handles empty value', () => {
    expect(parseQueryParam('http://x/?q=', 'q')).toBe('');
    expect(parseQueryParam('http://x/?a=&b=value', 'a')).toBe('');
  });

  test('handles key-only parameter', () => {
    expect(parseQueryParam('http://x/?q', 'q')).toBe('');
    expect(parseQueryParam('http://x/?a&b=value', 'a')).toBe('');
  });

  test('returns first value for multiple occurrences', () => {
    expect(parseQueryParam('http://x/?q=first&q=second', 'q')).toBe('first');
    expect(parseQueryParam('http://x/?a=1&a=2&a=3', 'a')).toBe('1');
  });

  test('decodes URL-encoded values', () => {
    expect(parseQueryParam('http://x/?q=hello%20world', 'q')).toBe('hello world');
    expect(parseQueryParam('http://x/?url=https%3A%2F%2Fexample.com', 'url')).toBe('https://example.com');
  });

  test('converts plus signs to spaces', () => {
    expect(parseQueryParam('http://x/?q=hello+world', 'q')).toBe('hello world');
    expect(parseQueryParam('http://x/?name=John+Doe', 'name')).toBe('John Doe');
  });

  test('handles mixed plus and percent encoding', () => {
    expect(parseQueryParam('http://x/?q=hello+%20world', 'q')).toBe('hello  world');
  });

  test('handles malformed percent encoding', () => {
    expect(parseQueryParam('http://x/?q=%ZZ', 'q')).toBe('%ZZ');
  });

  test('extracts parameter from middle of query string', () => {
    expect(parseQueryParam('http://x/?a=1&b=2&c=3', 'b')).toBe('2');
  });

  test('extracts last parameter', () => {
    expect(parseQueryParam('http://x/?a=1&b=2', 'b')).toBe('2');
  });
});

describe('parseQueryParamArray()', () => {
  test('returns single element array for single value', () => {
    expect(parseQueryParamArray('http://x/?q=hello', 'q')).toEqual(['hello']);
  });

  test('returns array with multiple values', () => {
    expect(parseQueryParamArray('http://x/?tags=a&tags=b&tags=c', 'tags')).toEqual(['a', 'b', 'c']);
  });

  test('returns undefined for missing parameter', () => {
    expect(parseQueryParamArray('http://x/?q=hello', 'missing')).toBeUndefined();
    expect(parseQueryParamArray('http://x/', 'q')).toBeUndefined();
  });

  test('handles empty values in array', () => {
    expect(parseQueryParamArray('http://x/?vals=&vals=value&vals=', 'vals')).toEqual(['', 'value', '']);
  });

  test('handles key-only values', () => {
    expect(parseQueryParamArray('http://x/?a&b', 'a')).toEqual(['']);
    expect(parseQueryParamArray('http://x/?a&b', 'b')).toEqual(['']);
  });

  test('decodes URL-encoded array values', () => {
    expect(parseQueryParamArray('http://x/?tags=tag%201&tags=tag%202', 'tags')).toEqual(['tag 1', 'tag 2']);
  });

  test('converts plus signs to spaces in array values', () => {
    expect(parseQueryParamArray('http://x/?items=item+1&items=item+2', 'items')).toEqual(['item 1', 'item 2']);
  });

  test('handles mixed encoded and plain values', () => {
    expect(parseQueryParamArray('http://x/?vals=plain&vals=encoded%20value&vals=with+plus', 'vals')).toEqual([
      'plain',
      'encoded value',
      'with plus',
    ]);
  });

  test('handles malformed percent encoding in array', () => {
    expect(parseQueryParamArray('http://x/?vals=good&vals=%ZZ&vals=also+good', 'vals')).toEqual([
      'good',
      '%ZZ',
      'also good',
    ]);
  });
});

describe('parseAllQueryParams()', () => {
  test('returns empty object for URL without query string', () => {
    expect(parseAllQueryParams('http://x/')).toEqual({});
    expect(parseAllQueryParams('http://x/path')).toEqual({});
  });

  test('returns empty object for URL with empty query string', () => {
    expect(parseAllQueryParams('http://x/?')).toEqual({});
  });

  test('parses single parameter', () => {
    expect(parseAllQueryParams('http://x/?q=hello')).toEqual({ q: 'hello' });
  });

  test('parses multiple parameters', () => {
    expect(parseAllQueryParams('http://x/?a=1&b=2&c=3')).toEqual({
      a: '1',
      b: '2',
      c: '3',
    });
  });

  test('handles duplicate keys as arrays', () => {
    expect(parseAllQueryParams('http://x/?tags=a&tags=b&tags=c')).toEqual({
      tags: ['a', 'b', 'c'],
    });
  });

  test('handles mixed single and array values', () => {
    expect(parseAllQueryParams('http://x/?q=hello&tags=a&tags=b')).toEqual({
      q: 'hello',
      tags: ['a', 'b'],
    });
  });

  test('decodes URL-encoded values', () => {
    expect(parseAllQueryParams('http://x/?name=hello%20world&city=New+York')).toEqual({
      name: 'hello world',
      city: 'New York',
    });
  });

  test('handles key-only parameters', () => {
    expect(parseAllQueryParams('http://x/?a&b')).toEqual({
      a: '',
      b: '',
    });
  });

  test('handles empty values', () => {
    expect(parseAllQueryParams('http://x/?a=&b=')).toEqual({
      a: '',
      b: '',
    });
  });

  test('handles complex mixed scenario', () => {
    expect(parseAllQueryParams('http://x/?q=hello&tags=a&tags=b&empty=&keyonly&last=value')).toEqual({
      q: 'hello',
      tags: ['a', 'b'],
      empty: '',
      keyonly: '',
      last: 'value',
    });
  });

  test('decodes complex URL-encoded values', () => {
    expect(parseAllQueryParams('http://x/?url=https%3A%2F%2Fexample.com&data=%7B%22key%22%3A%22value%22%7D')).toEqual({
      url: 'https://example.com',
      data: '{"key":"value"}',
    });
  });

  test('handles malformed percent encoding', () => {
    expect(parseAllQueryParams('http://x/?a=%ZZ&b=valid')).toEqual({
      a: '%ZZ',
      b: 'valid',
    });
  });

  test('returns null-prototype object to prevent prototype pollution', () => {
    const queries = parseAllQueryParams('http://x/?a=1');
    expect(Object.getPrototypeOf(queries)).toBeNull();
    expect(queries.constructor).toBeUndefined();
  });
});

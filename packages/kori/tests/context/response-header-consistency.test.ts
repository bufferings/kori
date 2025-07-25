import { describe, test, expect } from 'vitest';

import { createKoriResponse } from '../../src/context/response.js';
import { HttpResponseHeader, ContentTypeUtf8 } from '../../src/http/index.js';

describe('KoriResponse header consistency', () => {
  test('getContentType() returns correct value after res.json()', () => {
    const res = createKoriResponse();

    // Before calling json(), getContentType should return undefined
    expect(res.getContentType()).toBeUndefined();

    // After calling json(), getContentType should return the default Content-Type
    res.json({ message: 'test' });
    expect(res.getContentType()).toBe(ContentTypeUtf8.APPLICATION_JSON);

    // The built response should have the same Content-Type
    const response = res.build();
    expect(response.headers.get(HttpResponseHeader.CONTENT_TYPE)).toBe(ContentTypeUtf8.APPLICATION_JSON);
  });

  test('getContentType() returns correct value after res.text()', () => {
    const res = createKoriResponse();

    res.text('Hello World');
    expect(res.getContentType()).toBe(ContentTypeUtf8.TEXT_PLAIN);

    const response = res.build();
    expect(response.headers.get(HttpResponseHeader.CONTENT_TYPE)).toBe(ContentTypeUtf8.TEXT_PLAIN);
  });

  test('getContentType() returns correct value after res.html()', () => {
    const res = createKoriResponse();

    res.html('<h1>Hello</h1>');
    expect(res.getContentType()).toBe(ContentTypeUtf8.TEXT_HTML);

    const response = res.build();
    expect(response.headers.get(HttpResponseHeader.CONTENT_TYPE)).toBe(ContentTypeUtf8.TEXT_HTML);
  });

  test('getHeader() returns correct value for explicitly set headers', () => {
    const res = createKoriResponse();

    res.setHeader('X-Custom-Header', 'test-value');
    expect(res.getHeader('X-Custom-Header')).toBe('test-value');

    const response = res.build();
    expect(response.headers.get('X-Custom-Header')).toBe('test-value');
  });

  test('getHeader() returns correct value for Content-Type after body methods', () => {
    const res = createKoriResponse();

    res.json({ data: 'test' });
    expect(res.getHeader(HttpResponseHeader.CONTENT_TYPE)).toBe(ContentTypeUtf8.APPLICATION_JSON);

    const response = res.build();
    expect(response.headers.get(HttpResponseHeader.CONTENT_TYPE)).toBe(ContentTypeUtf8.APPLICATION_JSON);
  });

  test('getContentType() returns explicitly set Content-Type over default', () => {
    const res = createKoriResponse();

    res.json({ data: 'test' });
    res.setHeader(HttpResponseHeader.CONTENT_TYPE, 'application/vnd.api+json');

    expect(res.getContentType()).toBe('application/vnd.api+json');

    const response = res.build();
    expect(response.headers.get(HttpResponseHeader.CONTENT_TYPE)).toBe('application/vnd.api+json');
  });

  test('getContentType() returns undefined for empty responses', () => {
    const res = createKoriResponse();

    res.empty();
    expect(res.getContentType()).toBeUndefined();

    const response = res.build();
    expect(response.headers.get(HttpResponseHeader.CONTENT_TYPE)).toBeNull();
  });
});

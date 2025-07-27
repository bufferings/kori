import { describe, test, expect } from 'vitest';

import { type KoriRequest } from '../../src/context/request.js';
import { createKoriResponse } from '../../src/context/response.js';
import { HttpResponseHeader, ContentTypeUtf8 } from '../../src/http/index.js';

// Mock request for testing
const mockRequest = {
  header: () => 'application/json',
} as unknown as KoriRequest;

describe('KoriResponse header consistency', () => {
  test('getContentType() returns correct value after res.json()', () => {
    const res = createKoriResponse(mockRequest);

    // Before calling json(), getContentType should return undefined
    expect(res.getContentType()).toBeUndefined();

    // After calling json(), getContentType should return the default Content-Type
    res.json({ message: 'test' });
    expect(res.getContentType()).toBe(ContentTypeUtf8.APPLICATION_JSON);

    // Build and check final response
    const response = res.build();
    expect(response.headers.get(HttpResponseHeader.CONTENT_TYPE)).toBe(ContentTypeUtf8.APPLICATION_JSON);
  });

  test('getContentType() returns correct value after res.text()', () => {
    const res = createKoriResponse(mockRequest);

    res.text('test message');
    expect(res.getContentType()).toBe(ContentTypeUtf8.TEXT_PLAIN);

    const response = res.build();
    expect(response.headers.get(HttpResponseHeader.CONTENT_TYPE)).toBe(ContentTypeUtf8.TEXT_PLAIN);
  });

  test('getContentType() returns correct value after res.html()', () => {
    const res = createKoriResponse(mockRequest);

    res.html('<p>test</p>');
    expect(res.getContentType()).toBe(ContentTypeUtf8.TEXT_HTML);

    const response = res.build();
    expect(response.headers.get(HttpResponseHeader.CONTENT_TYPE)).toBe(ContentTypeUtf8.TEXT_HTML);
  });

  test('getContentType() returns correct value after res.empty()', () => {
    const res = createKoriResponse(mockRequest);

    res.empty();
    expect(res.getContentType()).toBeUndefined();

    const response = res.build();
    expect(response.headers.get(HttpResponseHeader.CONTENT_TYPE)).toBeNull();
  });

  test('getContentType() after manually set header', () => {
    const res = createKoriResponse(mockRequest);

    res.setHeader(HttpResponseHeader.CONTENT_TYPE, 'application/vnd.api+json');

    expect(res.getContentType()).toBe('application/vnd.api+json');

    const response = res.build();
    expect(response.headers.get(HttpResponseHeader.CONTENT_TYPE)).toBe('application/vnd.api+json');
  });

  test('getContentType() after manually set header and then json', () => {
    const res = createKoriResponse(mockRequest);

    res.setHeader(HttpResponseHeader.CONTENT_TYPE, 'application/custom').json({ test: 'data' });

    expect(res.getContentType()).toBe('application/custom');
  });

  test('getContentType() after manually set header and then text', () => {
    const res = createKoriResponse(mockRequest);

    res.setHeader(HttpResponseHeader.CONTENT_TYPE, 'text/custom').text('custom text');

    expect(res.getContentType()).toBe('text/custom');
  });

  test('getContentType() after manually set header and then html', () => {
    const res = createKoriResponse(mockRequest);

    res.setHeader(HttpResponseHeader.CONTENT_TYPE, 'text/custom').html('<div>custom</div>');

    expect(res.getContentType()).toBe('text/custom');
  });
});

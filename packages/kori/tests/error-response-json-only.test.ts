/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect } from 'vitest';

import { createKori } from '../src/index.js';

describe('Error Response JSON Only', () => {
  it('should always return JSON for badRequest regardless of Accept header', async () => {
    const app = createKori();

    app.get('/', (ctx) => {
      return ctx.res.badRequest({
        message: 'Invalid data',
        code: 'VALIDATION_ERROR',
        details: { field: 'email' },
      });
    });

    const { fetchHandler } = await app.generate().onStart();

    // Test with Accept: text/html
    const htmlRequest = new Request('http://localhost/', {
      headers: { Accept: 'text/html' },
    });

    const htmlResponse = await fetchHandler(htmlRequest);
    const htmlBody = await htmlResponse.json();

    expect(htmlResponse.status).toBe(400);
    expect(htmlResponse.headers.get('Content-Type')).toBe('application/json;charset=utf-8');
    expect(htmlBody).toEqual({
      error: {
        type: 'BAD_REQUEST',
        message: 'Invalid data',
        code: 'VALIDATION_ERROR',
        details: { field: 'email' },
      },
    });

    // Test with Accept: application/json
    const jsonRequest = new Request('http://localhost/', {
      headers: { Accept: 'application/json' },
    });

    const jsonResponse = await fetchHandler(jsonRequest);
    const jsonBody = await jsonResponse.json();

    expect(jsonResponse.status).toBe(400);
    expect(jsonResponse.headers.get('Content-Type')).toBe('application/json;charset=utf-8');
    expect(jsonBody).toEqual({
      error: {
        type: 'BAD_REQUEST',
        message: 'Invalid data',
        code: 'VALIDATION_ERROR',
        details: { field: 'email' },
      },
    });

    // Test with Accept: */*
    const wildcardRequest = new Request('http://localhost/', {
      headers: { Accept: '*/*' },
    });

    const wildcardResponse = await fetchHandler(wildcardRequest);
    const wildcardBody = await wildcardResponse.json();

    expect(wildcardResponse.status).toBe(400);
    expect(wildcardResponse.headers.get('Content-Type')).toBe('application/json;charset=utf-8');
    expect(wildcardBody).toEqual({
      error: {
        type: 'BAD_REQUEST',
        message: 'Invalid data',
        code: 'VALIDATION_ERROR',
        details: { field: 'email' },
      },
    });
  });

  it('should work with all error response methods', async () => {
    const app = createKori();

    app.get('/unauthorized', (ctx) => ctx.res.unauthorized({ message: 'No token' }));
    app.get('/forbidden', (ctx) => ctx.res.forbidden({ message: 'Access denied' }));
    app.get('/notfound', (ctx) => ctx.res.notFound({ message: 'Resource not found' }));
    app.get('/internal', (ctx) => ctx.res.internalError({ message: 'Server error' }));

    const { fetchHandler } = await app.generate().onStart();

    const testCases = [
      { path: '/unauthorized', status: 401, type: 'UNAUTHORIZED' },
      { path: '/forbidden', status: 403, type: 'FORBIDDEN' },
      { path: '/notfound', status: 404, type: 'NOT_FOUND' },
      { path: '/internal', status: 500, type: 'INTERNAL_SERVER_ERROR' },
    ];

    for (const testCase of testCases) {
      const response = await fetchHandler(new Request(`http://localhost${testCase.path}`));
      const body = await response.json();

      expect(response.status).toBe(testCase.status);
      expect(response.headers.get('Content-Type')).toBe('application/json;charset=utf-8');
      expect(body.error.type).toBe(testCase.type);
    }
  });

  it('should handle minimal error options', async () => {
    const app = createKori();

    app.get('/', (ctx) => {
      return ctx.res.badRequest(); // No options
    });

    const { fetchHandler } = await app.generate().onStart();
    const response = await fetchHandler(new Request('http://localhost/'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get('Content-Type')).toBe('application/json;charset=utf-8');
    expect(body).toEqual({
      error: {
        type: 'BAD_REQUEST',
        message: 'Bad Request',
      },
    });
  });
});

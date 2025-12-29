import { describe, test, expect } from 'vitest';

import { createKoriResponse } from '../../src/context/response.js';

describe('KoriResponse error helpers contract', () => {
  test('badRequest returns 400 with JSON error and default message', async () => {
    const response = createKoriResponse().badRequest().build();

    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');

    const body = await response.json();
    expect(body.error.type).toBe('BAD_REQUEST');
    expect(body.error.message).toBe('Bad Request');
  });

  test('unauthorized returns 401 with JSON error and default message', async () => {
    const response = createKoriResponse().unauthorized().build();

    expect(response.status).toBe(401);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');

    const body = await response.json();
    expect(body.error.type).toBe('UNAUTHORIZED');
    expect(body.error.message).toBe('Unauthorized');
  });

  test('forbidden returns 403 with JSON error and default message', async () => {
    const response = createKoriResponse().forbidden().build();

    expect(response.status).toBe(403);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');

    const body = await response.json();
    expect(body.error.type).toBe('FORBIDDEN');
    expect(body.error.message).toBe('Forbidden');
  });

  test('notFound returns 404 with JSON error and default message', async () => {
    const response = createKoriResponse().notFound().build();

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');

    const body = await response.json();
    expect(body.error.type).toBe('NOT_FOUND');
    expect(body.error.message).toBe('Not Found');
  });

  test('methodNotAllowed returns 405 with JSON error and default message', async () => {
    const response = createKoriResponse().methodNotAllowed().build();

    expect(response.status).toBe(405);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');

    const body = await response.json();
    expect(body.error.type).toBe('METHOD_NOT_ALLOWED');
    expect(body.error.message).toBe('Method Not Allowed');
  });

  test('unsupportedMediaType returns 415 with JSON error and default message', async () => {
    const response = createKoriResponse().unsupportedMediaType().build();

    expect(response.status).toBe(415);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');

    const body = await response.json();
    expect(body.error.type).toBe('UNSUPPORTED_MEDIA_TYPE');
    expect(body.error.message).toBe('Unsupported Media Type');
  });

  test('internalError returns 500 with JSON error and default message', async () => {
    const response = createKoriResponse().internalError().build();

    expect(response.status).toBe(500);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');

    const body = await response.json();
    expect(body.error.type).toBe('INTERNAL_SERVER_ERROR');
    expect(body.error.message).toBe('Internal Server Error');
  });

  test('timeout returns 408 with JSON error and default message', async () => {
    const response = createKoriResponse().timeout().build();

    expect(response.status).toBe(408);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');

    const body = await response.json();
    expect(body.error.type).toBe('TIMEOUT');
    expect(body.error.message).toBe('Request Timeout');
  });

  test('custom fields are echoed in JSON body', async () => {
    const response = createKoriResponse()
      .badRequest({
        message: 'Invalid',
        field: 'email',
        code: 'E001',
      })
      .build();

    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');

    const body = JSON.parse(await response.text());
    expect(body.error.type).toBe('BAD_REQUEST');
    expect(body.error.message).toBe('Invalid');
    expect(body.error.field).toBe('email');
    expect(body.error.code).toBe('E001');
  });
});

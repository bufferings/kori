import { describe, test, expect } from 'vitest';

import { createKori } from '../../src/index.js';

describe('HEAD request handling', () => {
  test('automatically handles HEAD request using GET handler', async () => {
    const app = createKori().get('/test', (ctx) => {
      return ctx.res.json({ message: 'hello' }).setHeader('x-custom', 'value');
    });

    const { fetchHandler } = await app.start();

    const res = await fetchHandler(new Request('http://localhost/test', { method: 'HEAD' }));

    expect(res.status).toBe(200);
    expect(res.headers.get('x-custom')).toBe('value');
    expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(res.body).toBeNull();
  });

  test('ctx.req.method() returns HEAD within the handler', async () => {
    let capturedMethod = '';

    const app = createKori().get('/method', (ctx) => {
      capturedMethod = ctx.req.method();
      return ctx.res.text('ok');
    });

    const { fetchHandler } = await app.start();

    await fetchHandler(new Request('http://localhost/method', { method: 'HEAD' }));

    expect(capturedMethod).toBe('HEAD');
  });

  test('returns 404 if no GET route exists', async () => {
    const app = createKori().post('/post-only', (ctx) => {
      return ctx.res.text('ok');
    });

    const { fetchHandler } = await app.start();

    const res = await fetchHandler(new Request('http://localhost/post-only', { method: 'HEAD' }));

    expect(res.status).toBe(404);
  });

  test('HEAD request to non-existent route returns 404', async () => {
    const app = createKori();
    const { fetchHandler } = await app.start();

    const res = await fetchHandler(new Request('http://localhost/404', { method: 'HEAD' }));

    expect(res.status).toBe(404);
  });
});

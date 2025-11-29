import { describe, test, expect } from 'vitest';

import { createKori } from '../../src/kori/index.js';

describe('createChild', () => {
  test('allows calling without arguments', async () => {
    const app = createKori();
    const child = app.createChild();

    child.get('/test', (ctx) => ctx.res.text('ok'));

    const { fetchHandler } = await app.start();
    const res = await fetchHandler(new Request('http://localhost/test'));

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });

  test('allows calling with prefix only', async () => {
    const app = createKori();
    const child = app.createChild({ prefix: '/api' });

    child.get('/users', (ctx) => ctx.res.text('users'));

    const { fetchHandler } = await app.start();
    const res = await fetchHandler(new Request('http://localhost/api/users'));

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('users');
  });

  test('allows calling with configure only', async () => {
    const app = createKori();
    app.createChild({
      configure: (child) => child.get('/test', (ctx) => ctx.res.text('configured')),
    });

    const { fetchHandler } = await app.start();
    const res = await fetchHandler(new Request('http://localhost/test'));

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('configured');
  });

  test('allows calling with both prefix and configure', async () => {
    const app = createKori();
    app.createChild({
      prefix: '/api',
      configure: (child) => child.get('/users', (ctx) => ctx.res.text('both')),
    });

    const { fetchHandler } = await app.start();
    const res = await fetchHandler(new Request('http://localhost/api/users'));

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('both');
  });

  test('child instance inherits parent hooks', async () => {
    const callOrder: string[] = [];

    const app = createKori().onRequest((ctx) => {
      callOrder.push('parent-hook');
      return ctx;
    });

    const child = app.createChild({ prefix: '/api' });
    child.get('/test', (ctx) => {
      callOrder.push('handler');
      return ctx.res.text('ok');
    });

    const { fetchHandler } = await app.start();
    await fetchHandler(new Request('http://localhost/api/test'));

    expect(callOrder).toEqual(['parent-hook', 'handler']);
  });
});

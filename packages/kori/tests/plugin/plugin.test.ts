import { describe, test, expect } from 'vitest';

import { type KoriEnvironment, type KoriRequest, type KoriResponse } from '../../src/context/index.js';
import { createKori } from '../../src/kori/index.js';

import { defineKoriPlugin } from '../../src/plugin/plugin.js';

describe('defineKoriPlugin', () => {
  test('returns a plugin object with name and optional version', () => {
    const p1 = <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>() =>
      defineKoriPlugin<Env, Req, Res>({
        name: 'p1',
        apply: (k) => k,
      });
    const p2 = <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>() =>
      defineKoriPlugin<Env, Req, Res>({
        name: 'p2',
        version: '1.2.3',
        apply: (k) => k,
      });

    expect(p1().name).toBe('p1');
    expect(p1().version).toBeUndefined();
    expect(p2().name).toBe('p2');
    expect(p2().version).toBe('1.2.3');
  });

  test('applying a plugin can extend environment: handler observes added field', async () => {
    const envPlugin = <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>() =>
      defineKoriPlugin<Env, Req, Res, { region: string }>({
        name: 'env',
        apply: (k) => k.onStart((ctx) => ctx.withEnv({ region: 'ap' })),
      });

    const app = createKori().applyPlugin(envPlugin());

    app.get('/region', (ctx) => {
      const region: string = ctx.env.region;
      return ctx.res.json({ region });
    });

    const { fetchHandler } = await app.start();
    const res = await fetchHandler(new Request('http://localhost/region'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ region: 'ap' });
  });

  test('applying a plugin can extend request: handler observes added field', async () => {
    const authPlugin = <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>() =>
      defineKoriPlugin<Env, Req, Res, object, { userId: string }>({
        name: 'auth',
        apply: (k) => k.onRequest((ctx) => ctx.withReq({ userId: 'user-123' })),
      });

    const app = createKori().applyPlugin(authPlugin());

    app.get('/me', (ctx) => {
      const userId: string = ctx.req.userId;
      return ctx.res.json({ id: userId });
    });

    const { fetchHandler } = await app.start();
    const res = await fetchHandler(new Request('http://localhost/me'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ id: 'user-123' });
  });

  test('multiple onRequest plugins compose request extensions', async () => {
    const userPlugin = <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>() =>
      defineKoriPlugin<Env, Req, Res, object, { userId: string }>({
        name: 'user',
        apply: (k) => k.onRequest((ctx) => ctx.withReq({ userId: 'u-123' })),
      });

    const rolePlugin = <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>() =>
      defineKoriPlugin<Env, Req, Res, object, { role: string }>({
        name: 'role',
        apply: (k) => k.onRequest((ctx) => ctx.withReq({ role: 'admin' })),
      });

    const app = createKori().applyPlugin(userPlugin()).applyPlugin(rolePlugin());

    app.get('/auth', (ctx) => {
      const userId: string = ctx.req.userId;
      const role: string = ctx.req.role;
      return ctx.res.json({ userId, role });
    });

    const { fetchHandler } = await app.start();
    const res = await fetchHandler(new Request('http://localhost/auth'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ userId: 'u-123', role: 'admin' });
  });

  test('composing plugins preserves all prior extensions (req, res, env)', async () => {
    const envPlugin = <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>() =>
      defineKoriPlugin<Env, Req, Res, { region: string }>({
        name: 'env',
        apply: (k) => k.onStart((ctx) => ctx.withEnv({ region: 'ap' })),
      });

    const userPlugin = <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>() =>
      defineKoriPlugin<Env, Req, Res, object, { userId: string }>({
        name: 'user',
        apply: (k) => k.onRequest((ctx) => ctx.withReq({ userId: 'u-1' })),
      });

    const okPlugin = <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>() =>
      defineKoriPlugin<Env, Req, Res, object, object, { ok: (data: unknown) => KoriResponse }>({
        name: 'resp',
        apply: (k) => k.onRequest((ctx) => ctx.withRes({ ok: (data: unknown) => ctx.res.json({ ok: true, data }) })),
      });

    const app = createKori().applyPlugin(envPlugin()).applyPlugin(userPlugin()).applyPlugin(okPlugin());

    app.get('/whoami', (ctx) => {
      const uid: string = ctx.req.userId;
      const region: string = ctx.env.region;
      return ctx.res.ok({ id: uid, region });
    });

    const { fetchHandler } = await app.start();
    const res = await fetchHandler(new Request('http://localhost/whoami'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, data: { id: 'u-1', region: 'ap' } });
  });
});

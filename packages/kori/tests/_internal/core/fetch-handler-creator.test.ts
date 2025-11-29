import { describe, test, expect } from 'vitest';

import { createFetchHandler } from '../../../src/_internal/core/fetch-handler-creator.js';
import { createRouteRegistry } from '../../../src/_internal/core/route-registry.js';
import { createKoriLoggerFactory } from '../../../src/logging/logger-factory.js';
import { createInstanceLogger } from '../../../src/logging/logger-helpers.js';

describe('createFetchHandler', () => {
  test('returns Response for matched route (normal flow)', async () => {
    const registry = createRouteRegistry();
    const routeId = registry.register({
      method: 'GET',
      path: '/users/:id',
      handler: (ctx: any) => ctx.res.json({ ok: true, id: ctx.req.param('id'), env: ctx.env?.flag }),
    });

    const compiledRouteMatcher = (_opts: unknown) => ({ routeId, pathParams: { id: '123' } });

    const loggerFactory = createKoriLoggerFactory();
    const instanceLogger = createInstanceLogger(loggerFactory);

    const onRouteNotFound = () => new Response('not-found', { status: 404 });

    const fh = createFetchHandler({
      compiledRouteMatcher,
      allStartHooks: [(ctx) => ctx.withEnv({ flag: 'from-start' })],
      loggerFactory,
      instanceLogger,
      routeRegistry: registry,
      onRouteNotFound,
    });

    const { fetchHandler, onClose } = await fh.onStart();

    const res = await fetchHandler(new Request('http://localhost/users/123'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(await res.text()).toBe(JSON.stringify({ ok: true, id: '123', env: 'from-start' }));

    await onClose();
  });

  test('executes deferred callbacks in reverse order on close', async () => {
    const registry = createRouteRegistry();
    const compiledRouteMatcher = (_opts: unknown) => undefined;

    const loggerFactory = createKoriLoggerFactory();
    const instanceLogger = createInstanceLogger(loggerFactory);

    const onRouteNotFound = () => new Response('not-found', { status: 404 });

    const callOrder: string[] = [];

    // First start hook that adds a deferred callback
    const firstStartHook = (ctx: any) => {
      ctx.defer(() => {
        callOrder.push('first-deferred');
      });
      return ctx;
    };

    // Second start hook that adds a deferred callback
    const secondStartHook = (ctx: any) => {
      ctx.defer(() => {
        callOrder.push('second-deferred');
      });
      return ctx;
    };

    const fh = createFetchHandler({
      compiledRouteMatcher,
      allStartHooks: [firstStartHook, secondStartHook],
      loggerFactory,
      instanceLogger,
      routeRegistry: registry,
      onRouteNotFound,
    });

    const { onClose } = await fh.onStart();

    // Execute onClose and verify deferred callbacks were called in reverse order (LIFO)
    await onClose();
    expect(callOrder).toEqual(['second-deferred', 'first-deferred']);
  });

  test('uses onRouteNotFound when no route matches', async () => {
    const registry = createRouteRegistry();
    const compiledRouteMatcher = (_opts: unknown) => undefined;

    const loggerFactory = createKoriLoggerFactory();
    const instanceLogger = createInstanceLogger(loggerFactory);

    const onRouteNotFound = () => new Response('no-match', { status: 404 });

    const fh = createFetchHandler({
      compiledRouteMatcher,
      allStartHooks: [],
      loggerFactory,
      instanceLogger,
      routeRegistry: registry,
      onRouteNotFound,
    });

    const { fetchHandler } = await fh.onStart();
    const res = await fetchHandler(new Request('http://localhost/none'));
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('no-match');
  });

  test('uses onRouteNotFound when routeId is not found in registry', async () => {
    const registry = createRouteRegistry();
    // Create a fake routeId that is not registered
    const fakeRouteId = Symbol('fake');
    const compiledRouteMatcher = (_opts: unknown) => ({ routeId: fakeRouteId, pathParams: {} });

    const loggerFactory = createKoriLoggerFactory();
    const instanceLogger = createInstanceLogger(loggerFactory);

    const onRouteNotFound = () => new Response('not-found', { status: 404 });

    const fh = createFetchHandler({
      compiledRouteMatcher,
      allStartHooks: [],
      loggerFactory,
      instanceLogger,
      routeRegistry: registry,
      onRouteNotFound,
    });

    const { fetchHandler } = await fh.onStart();
    const res = await fetchHandler(new Request('http://localhost/any'));
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('not-found');
  });

  test('onClose handles errors from deferred callbacks gracefully', async () => {
    const registry = createRouteRegistry();
    const compiledRouteMatcher = (_opts: unknown) => undefined;

    const loggerFactory = createKoriLoggerFactory();
    const instanceLogger = createInstanceLogger(loggerFactory);

    const onRouteNotFound = () => new Response('not-found', { status: 404 });

    // Start hook that adds a deferred callback which throws
    const problematicStartHook = (ctx: any) => {
      ctx.defer(() => {
        throw new Error('Deferred callback error');
      });
      return ctx;
    };

    const fh = createFetchHandler({
      compiledRouteMatcher,
      allStartHooks: [problematicStartHook],
      loggerFactory,
      instanceLogger,
      routeRegistry: registry,
      onRouteNotFound,
    });

    const { onClose } = await fh.onStart();

    // onClose should handle the deferred callback error gracefully
    await expect(onClose()).resolves.not.toThrow();
  });
});

import { describe, test, expect } from 'vitest';

import { createRouteRegistry, type RouteRecord } from '../../../src/_internal/core/route-registry.js';

describe('RouteRegistry contract', () => {
  test('can register and retrieve routes', () => {
    const registry = createRouteRegistry();
    const record: RouteRecord = {
      method: 'POST',
      path: '/users',
      handler: () => {},
      requestSchema: { provider: 'test' } as any,
      pluginMetadata: { [Symbol('test')]: 'value' },
    };

    const id = registry.register(record);
    const retrieved = registry.get(id);

    expect(retrieved).toEqual(record);
  });

  test('can get all registered routes', () => {
    const registry = createRouteRegistry();
    const route1: RouteRecord = { method: 'GET', path: '/first', handler: 'handler1' };
    const route2: RouteRecord = { method: 'POST', path: '/second', handler: 'handler2' };

    registry.register(route1);
    registry.register(route2);

    const all = registry.getAll();

    expect(all).toHaveLength(2);
    expect(all[0]).toEqual(route1);
    expect(all[1]).toEqual(route2);
  });

  test('register returns unique symbol ID for each route', () => {
    const registry = createRouteRegistry();
    const record: RouteRecord = {
      method: 'GET',
      path: '/test',
      handler: () => {},
    };

    const id1 = registry.register(record);
    const id2 = registry.register(record);

    expect(typeof id1).toBe('symbol');
    expect(typeof id2).toBe('symbol');
    expect(id1).not.toBe(id2);
  });

  test('get returns undefined for non-existent ID', () => {
    const registry = createRouteRegistry();
    const nonExistentId = Symbol('non-existent');

    const result = registry.get(nonExistentId);

    expect(result).toBeUndefined();
  });

  test('getAll returns routes in insertion order', () => {
    const registry = createRouteRegistry();
    const route1: RouteRecord = { method: 'GET', path: '/first', handler: 'handler1' };
    const route2: RouteRecord = { method: 'POST', path: '/second', handler: 'handler2' };
    const route3: RouteRecord = { method: 'PUT', path: '/third', handler: 'handler3' };

    registry.register(route1);
    registry.register(route2);
    registry.register(route3);

    const all = registry.getAll();

    expect(all).toHaveLength(3);
    expect(all[0]).toEqual(route1);
    expect(all[1]).toEqual(route2);
    expect(all[2]).toEqual(route3);
  });

  test('getAll returns empty array for empty registry', () => {
    const registry = createRouteRegistry();

    const result = registry.getAll();

    expect(result).toEqual([]);
  });

  test('handles all optional RouteRecord properties', () => {
    const registry = createRouteRegistry();
    const fullRecord: RouteRecord = {
      method: { custom: 'CUSTOM' },
      path: '/complex/:id',
      handler: () => {},
      requestSchema: { provider: 'zod' } as any,
      responseSchema: { provider: 'zod' } as any,
      onRequestValidationError: () => {},
      onResponseValidationError: () => {},
      pluginMetadata: {
        [Symbol('plugin1')]: { config: true },
        [Symbol('plugin2')]: { priority: 'high' },
      },
    };

    const id = registry.register(fullRecord);
    const retrieved = registry.get(id);

    expect(retrieved).toEqual(fullRecord);
  });
});

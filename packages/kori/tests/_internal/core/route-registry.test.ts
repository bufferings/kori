import { describe, test, expect } from 'vitest';

import { createKoriRequestSchema } from '../../../src/request-schema/index.js';
import { createKoriResponseSchema } from '../../../src/response-schema/index.js';

import { createRouteRegistry, type RouteRecord } from '../../../src/_internal/core/route-registry.js';

describe('RouteRegistry contract', () => {
  test('registers and retrieves routes', () => {
    const registry = createRouteRegistry();
    const record: RouteRecord = {
      method: 'POST',
      path: '/users',
      handler: () => {},
      requestSchema: createKoriRequestSchema({ provider: 'test-provider' }),
      pluginMetadata: { [Symbol('test')]: 'value' },
    };

    const id = registry.register(record);
    const retrieved = registry.get(id);

    expect(retrieved).toEqual(record);
  });

  test('returns all registered routes in insertion order', () => {
    const registry = createRouteRegistry();
    const route1: RouteRecord = { method: 'GET', path: '/first', handler: () => {} };
    const route2: RouteRecord = { method: 'POST', path: '/second', handler: () => {} };
    const route3: RouteRecord = { method: 'PUT', path: '/third', handler: () => {} };

    registry.register(route1);
    registry.register(route2);
    registry.register(route3);

    const all = registry.getAll();

    expect(all).toHaveLength(3);
    expect(all[0]).toEqual(route1);
    expect(all[1]).toEqual(route2);
    expect(all[2]).toEqual(route3);
  });

  test('generates unique symbol ID for each route', () => {
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

  test('includes method and path in symbol description', () => {
    const registry = createRouteRegistry();

    const getRecord: RouteRecord = { method: 'GET', path: '/users/:id', handler: () => {} };
    const postRecord: RouteRecord = { method: 'POST', path: '/posts', handler: () => {} };
    const customRecord: RouteRecord = { method: { custom: 'PURGE' }, path: '/cache', handler: () => {} };

    const getId = registry.register(getRecord);
    const postId = registry.register(postRecord);
    const customId = registry.register(customRecord);

    expect(getId.description).toBe('GET /users/:id');
    expect(postId.description).toBe('POST /posts');
    expect(customId.description).toBe('PURGE /cache');
  });

  test('returns undefined for non-existent ID', () => {
    const registry = createRouteRegistry();
    const nonExistentId = Symbol('non-existent');

    const result = registry.get(nonExistentId);

    expect(result).toBeUndefined();
  });

  test('returns empty array when no routes registered', () => {
    const registry = createRouteRegistry();

    const result = registry.getAll();

    expect(result).toEqual([]);
  });

  test('preserves all optional properties', () => {
    const registry = createRouteRegistry();
    const fullRecord: RouteRecord = {
      method: { custom: 'CUSTOM' },
      path: '/complex/:id',
      handler: () => {},
      requestSchema: createKoriRequestSchema({ provider: 'request-provider' }),
      responseSchema: createKoriResponseSchema({ provider: 'response-provider' }),
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

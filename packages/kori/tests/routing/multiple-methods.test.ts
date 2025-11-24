import { describe, expect, test } from 'vitest';

import { type KoriEnvironment, type KoriRequest, type KoriResponse } from '../../src/context/index.js';
import { createKori } from '../../src/kori/index.js';
import { type KoriHandler } from '../../src/routing/index.js';

import { type KoriRouteDefinition } from '../../src/routing/route-definition.js';

const mockHandler: KoriHandler<KoriEnvironment, KoriRequest, KoriResponse, string, undefined, undefined> = (ctx) =>
  ctx.res.text('test');

describe('Multiple methods registration', () => {
  describe('single method registration', () => {
    test('registers route with single method', async () => {
      const app = createKori();
      app.route({ method: 'GET', path: '/users', handler: mockHandler });

      const { fetchHandler } = await app.start();
      const request = new Request('http://localhost/users', { method: 'GET' });
      const response = await fetchHandler(request);

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('test');
    });
  });

  describe('multiple methods registration', () => {
    test('registers route with multiple methods using array', async () => {
      const app = createKori();
      app.route({ method: ['GET', 'POST'], path: '/users', handler: mockHandler });

      const { fetchHandler } = await app.start();

      const getResponse = await fetchHandler(new Request('http://localhost/users', { method: 'GET' }));
      expect(getResponse.status).toBe(200);

      const postResponse = await fetchHandler(new Request('http://localhost/users', { method: 'POST' }));
      expect(postResponse.status).toBe(200);
    });

    test('unregistered method returns 404', async () => {
      const app = createKori();
      app.route({ method: ['GET', 'POST'], path: '/users', handler: mockHandler });

      const { fetchHandler } = await app.start();

      const putResponse = await fetchHandler(new Request('http://localhost/users', { method: 'PUT' }));
      expect(putResponse.status).toBe(404);
    });

    test('works with custom HTTP methods', async () => {
      const app = createKori();
      app.route({ method: ['GET', { custom: 'PURGE' }], path: '/cache', handler: mockHandler });

      const { fetchHandler } = await app.start();

      const getResponse = await fetchHandler(new Request('http://localhost/cache', { method: 'GET' }));
      expect(getResponse.status).toBe(200);

      const purgeResponse = await fetchHandler(new Request('http://localhost/cache', { method: 'PURGE' }));
      expect(purgeResponse.status).toBe(200);
    });

    test('allows duplicate methods in array', async () => {
      const app = createKori();
      app.route({ method: ['GET', 'GET', 'POST'], path: '/duplicate', handler: mockHandler });

      const { fetchHandler } = await app.start();

      const getResponse = await fetchHandler(new Request('http://localhost/duplicate', { method: 'GET' }));
      expect(getResponse.status).toBe(200);

      const postResponse = await fetchHandler(new Request('http://localhost/duplicate', { method: 'POST' }));
      expect(postResponse.status).toBe(200);
    });
  });

  describe('route definitions', () => {
    test('creates separate route definitions for each method', () => {
      const app = createKori();
      app.route({ method: ['GET', 'POST'], path: '/users', handler: mockHandler });

      const definitions = app.routeDefinitions();
      const userRoutes = definitions.filter((def: KoriRouteDefinition) => def.path === '/users');

      expect(userRoutes).toHaveLength(2);
      expect(userRoutes.some((def: KoriRouteDefinition) => def.method === 'GET')).toBe(true);
      expect(userRoutes.some((def: KoriRouteDefinition) => def.method === 'POST')).toBe(true);
    });
  });
});

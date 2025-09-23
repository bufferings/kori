import { describe, expect, test } from 'vitest';

import { type KoriEnvironment, type KoriRequest, type KoriResponse } from '../../src/context/index.js';
import { KoriRouteDefinitionError } from '../../src/error/index.js';
import { createKori } from '../../src/kori/index.js';
import { type KoriHandler } from '../../src/routing/index.js';

const mockHandler: KoriHandler<KoriEnvironment, KoriRequest, KoriResponse, string, undefined, undefined> = (ctx) =>
  ctx.res.text('test');

describe('Route definition validation', () => {
  describe('middle optional parameter detection', () => {
    test('throws error for single middle optional parameter', () => {
      const app = createKori();

      expect(() => {
        app.get('/api/:version?/users/:id', mockHandler);
      }).toThrow(KoriRouteDefinitionError);
    });

    test('throws error with specific message for middle optional', () => {
      const app = createKori();

      expect(() => {
        app.get('/api/:version?/users/:id', mockHandler);
      }).toThrow('Kori does not support optional parameters ":param?" in the middle of paths.');
    });

    test('throws error for multiple middle optional parameters', () => {
      const app = createKori();

      expect(() => {
        app.get('/:lang?/api/:version?/users/:id', mockHandler);
      }).toThrow(KoriRouteDefinitionError);
    });

    test('throws error for optional parameter with trailing slash', () => {
      const app = createKori();

      expect(() => {
        app.get('/api/:version?/', mockHandler);
      }).toThrow(KoriRouteDefinitionError);
    });

    test('throws error for parent-child route combination creating middle optional', () => {
      const app = createKori();

      expect(() => {
        app.createChild({
          prefix: '/api/:version?',
          configure: (child) => child.get('/users/:id', mockHandler),
        });
      }).toThrow(KoriRouteDefinitionError);
    });
  });

  describe('valid route patterns', () => {
    test('allows trailing optional parameters', () => {
      const app = createKori();

      expect(() => {
        app.get('/api/users/:id?', mockHandler);
      }).not.toThrow();
    });

    test('allows normal parameters without optional', () => {
      const app = createKori();

      expect(() => {
        app.get('/api/:version/users/:id', mockHandler);
      }).not.toThrow();
    });

    test('allows root level optional parameter', () => {
      const app = createKori();

      expect(() => {
        app.get('/:version?', mockHandler);
      }).not.toThrow();
    });

    test('allows optional parameter with constraints at end', () => {
      const app = createKori();

      expect(() => {
        app.get('/posts/:id{[0-9]+}?', mockHandler);
      }).not.toThrow();
    });
  });
});

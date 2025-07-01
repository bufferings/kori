/**
 * Kori Child Instances Guide
 *
 * This file demonstrates child instance capabilities including:
 * - API versioning with child instances
 * - Nested routing and prefixes
 * - Instance-specific hooks and middleware
 * - Admin sections with authentication
 * - Multi-level nesting
 */

import { type Kori, type KoriEnvironment, type KoriRequest, type KoriResponse } from 'kori';
import { type KoriZodRequestValidator, type KoriZodResponseValidator } from 'kori-zod-validator';

/**
 * Configure Child Instances example routes
 * This demonstrates comprehensive child instance and nesting patterns
 */
export function configure<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(
  k: Kori<Env, Req, Res, KoriZodRequestValidator, KoriZodResponseValidator>,
): Kori<Env, Req, Res, KoriZodRequestValidator, KoriZodResponseValidator> {
  // Root application setup
  const app = k
    .get('/', (ctx) =>
      ctx.res.json({
        message: 'Welcome to Child Instances Examples!',
        description: 'This demonstrates API versioning and nested routing',
        availableApis: {
          v1: '/api/v1/*',
          v2: '/api/v2/*',
          admin: '/admin/*',
          services: '/services/*',
          modules: '/modules/*',
        },
      }),
    )
    .onInit(() => {
      app.log.info('Child Instances example initialized');
    })
    .onRequest((ctx) => {
      return ctx.withReq({ appVersion: '1.0.0' });
    });

  // API v1
  const v1 = app.createChild({
    prefix: '/api/v1',
    configure: (kori) => {
      return kori.onRequest((ctx) => {
        return ctx.withReq({ apiVersion: 'v1' });
      });
    },
  });

  v1.get('/users', (ctx) =>
    ctx.res.json({
      apiVersion: ctx.req.apiVersion,
      appVersion: ctx.req.appVersion,
      users: [
        { id: 1, name: 'Alice', version: 'v1' },
        { id: 2, name: 'Bob', version: 'v1' },
      ],
    }),
  );

  v1.get('/posts', (ctx) =>
    ctx.res.json({
      apiVersion: ctx.req.apiVersion,
      posts: [
        { id: 1, title: 'Hello World', version: 'v1' },
        { id: 2, title: 'Kori Framework', version: 'v1' },
      ],
    }),
  );

  // API v2 with enhanced features
  app
    .createChild({
      prefix: '/api/v2',
      configure: (kori) => {
        return kori.onRequest((ctx) => {
          return ctx.withReq({
            apiVersion: 'v2',
            features: ['pagination', 'filtering', 'sorting'],
          });
        });
      },
    })
    .get('/users', (ctx) =>
      ctx.res.json({
        apiVersion: ctx.req.apiVersion,
        appVersion: ctx.req.appVersion,
        features: ctx.req.features,
        users: [
          {
            id: 1,
            name: 'Alice',
            email: 'alice@example.com',
            createdAt: '2024-01-01T00:00:00Z',
            version: 'v2',
          },
          {
            id: 2,
            name: 'Bob',
            email: 'bob@example.com',
            createdAt: '2024-01-02T00:00:00Z',
            version: 'v2',
          },
        ],
      }),
    );

  // Admin section with authentication
  const admin = app.createChild({
    prefix: '/admin',
    configure: (kori) => {
      return kori
        .onRequest((ctx) => {
          const authHeader = ctx.req.headers['x-admin-token'];

          if (!authHeader || authHeader !== 'admin-secret') {
            ctx.req.log.warn('Unauthorized admin access attempt');
            throw new Error('Unauthorized');
          }

          ctx.req.log.info('Admin access granted');
          return ctx.withReq({ isAdmin: true });
        })
        .onError((ctx, error) => {
          if ((error as Error).message === 'Unauthorized' && !ctx.res.isSet()) {
            ctx.res.unauthorized({ message: 'Admin access required' });
          }
        });
    },
  });

  admin.get('/stats', (ctx) =>
    ctx.res.json({
      isAdmin: ctx.req.isAdmin,
      stats: {
        totalUsers: 100,
        totalPosts: 500,
        activeUsers: 85,
      },
    }),
  );

  admin.get('/config', (ctx) =>
    ctx.res.json({
      isAdmin: ctx.req.isAdmin,
      config: {
        maintenanceMode: false,
        apiRateLimit: 1000,
        debugMode: true,
      },
    }),
  );

  // Public/Private services example
  const services = app.createChild({
    prefix: '/services',
    configure: (kori) => kori,
  });

  const publicApi = services.createChild({
    prefix: '/public',
    configure: (kori) => kori,
  });

  const privateApi = services.createChild({
    prefix: '/private',
    configure: (kori) => {
      return kori
        .onRequest((ctx) => {
          const apiKey = ctx.req.headers['x-api-key'];
          if (!apiKey) {
            throw new Error('API key required');
          }
          return ctx.withReq({ apiKey });
        })
        .onError((ctx, error) => {
          if ((error as Error).message === 'API key required' && !ctx.res.isSet()) {
            ctx.res.forbidden({ message: (error as Error).message });
          }
        });
    },
  });

  publicApi.get('/status', (ctx) => ctx.res.json({ status: 'ok', public: true }));

  privateApi.get('/data', (ctx) =>
    ctx.res.json({
      data: 'sensitive information',
      apiKey: ctx.req.apiKey.substring(0, 8) + '...',
    }),
  );

  // Nested module structure
  const modules = app.createChild({
    prefix: '/modules',
    configure: (kori) => kori,
  });

  const moduleA = modules.createChild({
    prefix: '/a',
    configure: (kori) => kori,
  });

  const moduleB = modules.createChild({
    prefix: '/b',
    configure: (kori) => kori,
  });

  moduleA.get('/info', (ctx) => ctx.res.json({ module: 'A', version: '1.0.0' }));

  const moduleB1 = moduleB.createChild({
    prefix: '/v1',
    configure: (kori) => kori,
  });

  const moduleB2 = moduleB.createChild({
    prefix: '/v2',
    configure: (kori) => kori,
  });

  moduleB1.get('/feature', (ctx) => ctx.res.json({ module: 'B.1', feature: 'advanced' }));

  moduleB2.get('/feature', (ctx) => ctx.res.json({ module: 'B.2', feature: 'experimental' }));

  // Initialization hook
  app.onInit(() => {
    app.log.info('Child Instances example initialized!');
    app.log.info('Available endpoints:');
    app.log.info('   GET  /              - Welcome message');
    app.log.info('   GET  /api/v1/users  - API v1 users');
    app.log.info('   GET  /api/v1/posts  - API v1 posts');
    app.log.info('   GET  /api/v2/users  - API v2 users (enhanced)');
    app.log.info('   GET  /admin/stats   - Admin stats (requires x-admin-token: admin-secret)');
    app.log.info('   GET  /admin/config  - Admin config (requires x-admin-token: admin-secret)');
    app.log.info('   GET  /services/public/status - Public service status');
    app.log.info('   GET  /services/private/data  - Private service data (requires x-api-key)');
    app.log.info('   GET  /modules/a/info - Module A info');
    app.log.info('   GET  /modules/b/v1/feature - Module B v1 feature');
    app.log.info('   GET  /modules/b/v2/feature - Module B v2 feature');
    app.log.info('');
    app.log.info('Child Instances example ready!');
  });

  return app;
}

import { createKori } from 'kori';
import type { KoriEnvironment, KoriHandlerContext, KoriRequest, KoriResponse } from 'kori';

type KoriApp = ReturnType<typeof createKori>;
type Ctx = KoriHandlerContext<KoriEnvironment, KoriRequest, KoriResponse>;

export function configure(app: KoriApp): KoriApp {
  app
    .get('/', (ctx: Ctx) => ctx.res.json({ message: 'Main application root' }))
    .onInit(() => {
      app.log.info('Main application initialized');
    })
    .onRequest((ctx: Ctx) => {
      return ctx.withReq({ appVersion: '1.0.0' });
    });

  // API v1
  const v1 = app
    .createChild({
      prefix: '/api/v1',
      configure: (kori: KoriApp) => {
        return (kori as KoriApp).onRequest((ctx: Ctx) => {
          return ctx.withReq({ apiVersion: 'v1' });
        });
      },
    })
    .get('/users', (ctx: Ctx) =>
      ctx.res.json({
        apiVersion: ctx.req.apiVersion,
        appVersion: ctx.req.appVersion,
        users: [
          { id: 1, name: 'Alice', version: 'v1' },
          { id: 2, name: 'Bob', version: 'v1' },
        ],
      }),
    );

  v1.get('/posts', (ctx: Ctx) =>
    ctx.res.json({
      apiVersion: ctx.req.apiVersion,
      posts: [
        { id: 1, title: 'Hello World', version: 'v1' },
        { id: 2, title: 'Kori Framework', version: 'v1' },
      ],
    }),
  );

  // API v2
  app
    .createChild({
      prefix: '/api/v2',
      configure: (kori: KoriApp) => {
        return (kori as KoriApp).onRequest((ctx: Ctx) => {
          return ctx.withReq({
            apiVersion: 'v2',
            features: ['pagination', 'filtering', 'sorting'],
          });
        });
      },
    })
    .get('/users', (ctx: Ctx) =>
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

  // Admin section
  const admin = app.createChild({
    prefix: '/admin',
    configure: (kori: KoriApp) => {
      return (kori as KoriApp)
        .onRequest((ctx: Ctx) => {
          const authHeader = ctx.req.headers['x-admin-token'];

          if (!authHeader || authHeader !== 'admin-secret') {
            ctx.req.log.warn('Unauthorized admin access attempt');
            throw new Error('Unauthorized');
          }

          ctx.req.log.info('Admin access granted');
          return ctx.withReq({ isAdmin: true });
        })
        .onError((ctx: Ctx, error: unknown) => {
          if ((error as Error).message === 'Unauthorized' && !ctx.res.isSet()) {
            ctx.res.unauthorized({ message: 'Admin access required' });
          }
        });
    },
  });

  admin.get('/stats', (ctx: Ctx) =>
    ctx.res.json({
      isAdmin: ctx.req.isAdmin,
      stats: {
        totalUsers: 100,
        totalPosts: 500,
        activeUsers: 85,
      },
    }),
  );

  admin.get('/config', (ctx: Ctx) =>
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
    configure: (kori: KoriApp) => kori,
  });

  const publicApi = services.createChild({
    prefix: '/public',
    configure: (kori: KoriApp) => kori,
  });

  const privateApi = services.createChild({
    prefix: '/private',
    configure: (kori: KoriApp) => {
      return (kori as KoriApp)
        .onRequest((ctx: Ctx) => {
          const apiKey = ctx.req.headers['x-api-key'];
          if (!apiKey) {
            throw new Error('API key required');
          }
          return ctx.withReq({ apiKey });
        })
        .onError((ctx: Ctx, error: unknown) => {
          if ((error as Error).message === 'API key required' && !ctx.res.isSet()) {
            ctx.res.forbidden({ message: (error as Error).message });
          }
        });
    },
  });

  publicApi.get('/status', (ctx: Ctx) => ctx.res.json({ status: 'ok', public: true }));

  privateApi.get('/data', (ctx: Ctx) =>
    ctx.res.json({
      data: 'sensitive information',
      apiKey: ctx.req.apiKey.substring(0, 8) + '...',
    }),
  );

  // Nested module structure
  const modules = app.createChild({
    prefix: '/modules',
    configure: (kori: KoriApp) => kori,
  });

  const moduleA = modules.createChild({
    prefix: '/a',
    configure: (kori: KoriApp) => kori,
  });

  const moduleB = modules.createChild({
    prefix: '/b',
    configure: (kori: KoriApp) => kori,
  });

  moduleA.get('/info', (ctx: Ctx) => ctx.res.json({ module: 'A', version: '1.0.0' }));

  const moduleB1 = moduleB.createChild({
    prefix: '/v1',
    configure: (kori: KoriApp) => kori,
  });

  const moduleB2 = moduleB.createChild({
    prefix: '/v2',
    configure: (kori: KoriApp) => kori,
  });

  moduleB1.get('/feature', (ctx: Ctx) => ctx.res.json({ module: 'B.1', feature: 'advanced' }));

  moduleB2.get('/feature', (ctx: Ctx) => ctx.res.json({ module: 'B.2', feature: 'experimental' }));

  return app;
}

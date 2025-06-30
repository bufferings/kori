import { createKori, getMethodString } from 'kori';
import type { KoriEnvironment, KoriHandlerContext, KoriRequest, KoriResponse } from 'kori';

type KoriApp = ReturnType<typeof createKori>;
type Ctx = KoriHandlerContext<KoriEnvironment, KoriRequest, KoriResponse>;

let requestCount = 0;
const activeRequests = new Map<string, number>();

export function configure(app: KoriApp): KoriApp {
  app.onInit(() => {
    app.log.info('Application is initializing...');
    app.log.info('Environment:' + (process.env.NODE_ENV ?? 'development'));
    app.log.info('Starting request counter...');
  })
  .onRequest((ctx: Ctx) => {
    requestCount++;
    const requestId = `req-${requestCount}`;
    const startTime = Date.now();

    activeRequests.set(requestId, startTime);

    ctx.req.log.info('Request started', {
      requestId,
      method: ctx.req.method,
      url: ctx.req.url.href,
      activeRequests: activeRequests.size,
    });

    return ctx.withReq({ requestId, startTime });
  })
  .onResponse((ctx: Ctx) => {
    const requestId = ctx.req.requestId;
    const startTime = ctx.req.startTime;
    const duration = Date.now() - startTime;

    activeRequests.delete(requestId);

    ctx.req.log.info('Request completed', {
      requestId,
      duration,
      status: ctx.res.getStatus(),
      activeRequests: activeRequests.size,
    });
  })
  .onError((ctx: Ctx, error: unknown) => {
    const requestId = ctx.req.requestId;

    ctx.req.log.error('Request error occurred', {
      requestId,
      error: (error as Error).message,
      stack: (error as Error).stack,
      url: ctx.req.url.href,
    });
  })
  .onFinally((ctx: Ctx) => {
    const requestId = ctx.req.requestId;
    const startTime = ctx.req.startTime;
    const totalDuration = Date.now() - startTime;

    if (totalDuration > 1000) {
      ctx.req.log.warn('Slow request detected', {
        requestId,
        totalDuration,
      });
    }

    if (activeRequests.has(requestId)) {
      activeRequests.delete(requestId);
      ctx.req.log.warn('Cleaned up unfinished request', { requestId });
    }
  })
  .onClose(() => {
    app.log.info('Application is shutting down...', {
      totalRequests: requestCount,
      activeRequests: activeRequests.size,
    });

    if (activeRequests.size > 0) {
      app.log.warn('Shutting down with active requests', {
        activeRequestIds: Array.from(activeRequests.keys()),
      });
    }
  })
  .get('/health', (ctx: Ctx) =>
    ctx.res.json({
      status: 'healthy',
      requestCount,
      activeRequests: activeRequests.size,
      uptime: process.uptime(),
      requestId: ctx.req.requestId,
    }),
  )
  .get('/slow', async (ctx: Ctx) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return ctx.res.json({
      message: 'This was a slow request',
      requestId: ctx.req.requestId,
    });
  })
  .get('/error', () => {
    throw new Error('This is an intentional error');
  })
  .get('/data/:id', (ctx: Ctx) => {
    const id = ctx.req.pathParams.id;

    if (id === '0') {
      throw new Error('Invalid ID: 0');
    }

    return ctx.res.json({
      id,
      data: `Data for ID ${id}`,
      requestId: ctx.req.requestId,
    });
  });

// Example of nested app with hooks
const authApp = app
  .createChild()
  .onRequest<{ user: { id: string; token: string } | null }, unknown>((ctx: Ctx) => {
    const authHeader = ctx.req.headers.authorization;

    if (!authHeader) {
      ctx.req.log.info('No authorization header found');
      return ctx.withReq({ user: null });
    } else {
      const token = authHeader.replace('Bearer ', '');
      ctx.req.log.info('Auth token found', { token: token.substring(0, 8) + '...' });
      return ctx.withReq({ user: { id: 'user123', token } });
    }
  })
  .onResponse((ctx: Ctx) => {
    if (ctx.req.user) {
      ctx.res.setHeader('X-User-Id', ctx.req.user.id);
      ctx.req.log.info('Added user ID to response headers');
    }
  });

authApp.get('/profile', (ctx: Ctx) => {
  const user = ctx.req.user;

  if (!user) {
    return ctx.res.unauthorized({ message: 'Authorization required' });
  }

  return ctx.res.json({
    user,
    requestId: ctx.req.requestId,
  });
});

app.createChild({
  prefix: '/api',
  configure: (kori: KoriApp) => {
    // Apply auth hooks to API routes
    authApp.routeDefinitions().forEach((route) => {
      kori.addRoute({
        method: route.method,
        path: route.path,
        handler: (ctx: Ctx) => {
          // Simplified demonstration of child instance
          return ctx.res.json({
            message: `API route: ${getMethodString(route.method)} ${route.path}`,
            note: 'This would normally delegate to the auth app',
          });
        },
      });
    });
    return kori;
  },
});

return app;

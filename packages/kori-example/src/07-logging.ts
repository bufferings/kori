import { createKori } from 'kori';
import type { KoriEnvironment, KoriHandlerContext, KoriRequest, KoriResponse } from 'kori';

type KoriApp = ReturnType<typeof createKori>;
type Ctx = KoriHandlerContext<KoriEnvironment, KoriRequest, KoriResponse>;

// ---------------------------------------------------------------------------
// Public API (configure)
// ---------------------------------------------------------------------------

export function configure(app: KoriApp): KoriApp {
  // Simple logging endpoint
  app.addRoute({
    method: 'GET',
    path: '/hello',
    handler: (ctx: Ctx) => {
      ctx.req.log.info('Processing hello request');
      ctx.req.log.debug('Debug information', { timestamp: Date.now() });
      return ctx.res.json({ message: 'Hello with simple logger' });
    },
  });

  // Enhanced contextual logging
  app.addRoute({
    method: 'GET',
    path: '/user/:id',
    handler: (ctx: Ctx) => {
      const userId = ctx.req.pathParams.id;
      const requestId = Math.random().toString(36).substring(7);

      ctx.req.log.info('Fetching user data', { userId, requestId });

      const user = {
        id: userId,
        name: 'John Doe',
        email: 'john@example.com',
      } as const;

      ctx.req.log.info('User data fetched successfully', { user, requestId });

      return ctx.res.json(user);
    },
  });

  // Performance logging handlers
  let requestCounter = 0;
  const requestTimings = new Map<string, { startTime: number; requestNumber: number }>();

  app.onRequest((ctx: Ctx) => {
    const requestNumber = ++requestCounter;
    const startTime = Date.now();
    const requestKey = `${ctx.req.method}-${ctx.req.url.pathname}-${requestNumber}`;

    requestTimings.set(requestKey, { startTime, requestNumber });
    ctx.req.log.info('Request started', { requestNumber, requestKey });
  });

  app.onResponse((ctx: Ctx) => {
    const endTime = Date.now();
    const requestKey = `${ctx.req.method}-${ctx.req.url.pathname}`;

    for (const [key, value] of requestTimings.entries()) {
      if (key.startsWith(requestKey)) {
        const duration = endTime - value.startTime;
        ctx.req.log.info('Request completed', {
          requestNumber: value.requestNumber,
          duration,
          category: duration < 100 ? 'fast' : duration < 500 ? 'medium' : 'slow',
        });
        requestTimings.delete(key);
        break;
      }
    }
  });

  app.addRoute({
    method: 'GET',
    path: '/metrics',
    handler: (ctx: Ctx) => {
      ctx.req.log.info('System metrics', {
        metrics: {
          cpu: process.cpuUsage(),
          memory: process.memoryUsage(),
          uptime: process.uptime(),
        },
      });

      return ctx.res.json({
        requestCount: requestCounter,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      });
    },
  });

  return app;
}

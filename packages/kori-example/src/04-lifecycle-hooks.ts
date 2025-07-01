/**
 * Kori Lifecycle Hooks Guide
 *
 * This file demonstrates lifecycle hook capabilities including:
 * - onInit, onClose hooks
 * - onRequest, onResponse, onError, onFinally hooks
 * - Request tracking and monitoring
 * - Child instances with hooks
 */

import { type Kori, type KoriEnvironment, type KoriRequest, type KoriResponse } from 'kori';
import { type KoriZodRequestValidator, type KoriZodResponseValidator } from 'kori-zod-validator';

/**
 * Configure Lifecycle Hooks example routes
 * This demonstrates comprehensive lifecycle management
 */
export function configure<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(
  k: Kori<Env, Req, Res, KoriZodRequestValidator, KoriZodResponseValidator>,
): Kori<Env, Req, Res, KoriZodRequestValidator, KoriZodResponseValidator> {
  // Request tracking state (encapsulated within this instance)
  let requestCount = 0;
  const activeRequests = new Map<string, number>();

  // Apply lifecycle hooks to the app
  const app = k
    .onInit(() => {
      app.log.info('Lifecycle Hooks example initializing...');
      app.log.info('Environment: ' + (process.env.NODE_ENV ?? 'development'));
      app.log.info('Starting request counter...');
    })
    .onRequest((ctx) => {
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
    .onResponse((ctx) => {
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
    .onError((ctx, error) => {
      const requestId = ctx.req.requestId;

      ctx.req.log.error('Request error occurred', {
        requestId,
        error: (error as Error).message,
        stack: (error as Error).stack,
        url: ctx.req.url.href,
      });
    })
    .onFinally((ctx) => {
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
      app.log.info('Lifecycle Hooks example shutting down...', {
        totalRequests: requestCount,
        activeRequests: activeRequests.size,
      });

      if (activeRequests.size > 0) {
        app.log.warn('Shutting down with active requests', {
          activeRequestIds: Array.from(activeRequests.keys()),
        });
      }
    });

  // Welcome route
  app.get('/', (ctx) =>
    ctx.res.json({
      message: 'Welcome to Kori Lifecycle Hooks Examples!',
      description: 'This example demonstrates request lifecycle management',
      currentStats: {
        requestCount,
        activeRequests: activeRequests.size,
        uptime: process.uptime(),
      },
    }),
  );

  // Health check endpoint
  app.get('/health', (ctx) =>
    ctx.res.json({
      status: 'healthy',
      requestCount,
      activeRequests: activeRequests.size,
      uptime: process.uptime(),
      requestId: ctx.req.requestId,
    }),
  );

  // Slow endpoint to test timing hooks
  app.get('/slow', async (ctx) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return ctx.res.json({
      message: 'This was a slow request (2 seconds)',
      requestId: ctx.req.requestId,
      duration: '2000ms',
    });
  });

  // Error endpoint to test error hooks
  app.get('/error', () => {
    throw new Error('This is an intentional error for testing');
  });

  // Data endpoint with validation
  app.get('/data/:id', (ctx) => {
    const id = ctx.req.pathParams.id;

    if (id === '0') {
      throw new Error('Invalid ID: 0 is not allowed');
    }

    return ctx.res.json({
      id,
      data: `Data for ID ${id}`,
      requestId: ctx.req.requestId,
      timestamp: new Date().toISOString(),
    });
  });

  // Create child instance with additional auth hooks
  app.createChild({
    prefix: '/auth',
    configure: (kc) =>
      kc
        .onRequest<{ user: { id: string; token: string } | null }, unknown>((ctx) => {
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
        .onResponse((ctx) => {
          if (ctx.req.user) {
            ctx.res.setHeader('X-User-Id', ctx.req.user.id);
            ctx.req.log.info('Added user ID to response headers');
          }
        })

        // Auth-protected profile endpoint
        .get('/profile', (ctx) => {
          const user = ctx.req.user;

          if (!user) {
            return ctx.res.unauthorized({ message: 'Authorization required' });
          }

          return ctx.res.json({
            message: 'Profile accessed successfully',
            user,
            requestId: ctx.req.requestId,
            note: 'This endpoint demonstrates child instance with auth hooks',
          });
        }),
  });

  // API child with simplified route delegation example
  app.createChild({
    prefix: '/api',
    configure: (kc) =>
      kc.get('/status', (ctx) =>
        ctx.res.json({
          message: 'API status endpoint',
          note: 'This demonstrates child instance configuration',
          requestId: ctx.req.requestId,
        }),
      ),
  });

  // Initialization hook specific to this example
  app.onInit(() => {
    app.log.info('Lifecycle Hooks example initialized!');
    app.log.info('Available endpoints:');
    app.log.info('   GET  /              - Welcome message with stats');
    app.log.info('   GET  /health        - Health check with stats');
    app.log.info('   GET  /slow          - Slow request (2s delay)');
    app.log.info('   GET  /error         - Intentional error');
    app.log.info('   GET  /data/:id      - Data endpoint with validation');
    app.log.info('   GET  /auth/profile  - Auth-protected profile');
    app.log.info('   GET  /api/status    - API status (child instance)');
    app.log.info('');
    app.log.info('Lifecycle Hooks example ready!');
  });

  return app;
}

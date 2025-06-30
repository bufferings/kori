import { type Kori, type KoriEnvironment, type KoriRequest, type KoriResponse } from 'kori';

// Simple logging example
export function configureSimple(app: Kori<any, any, any, any, any>) {
  app.addRoute({
    method: 'GET',
    path: '/hello',
    handler: (ctx) => {
      ctx.req.log.info('Processing hello request');
      ctx.req.log.debug('Debug information', { timestamp: Date.now() });
      return ctx.res.json({ message: 'Hello with simple logger' });
    },
  });

  return app;
}

// Enhanced logging with context - using ctx.req.log directly
export function configureContextual(app: Kori<any, any, any, any, any>) {
  app.addRoute({
    method: 'GET',
    path: '/user/:id',
    handler: (ctx) => {
      const userId = ctx.req.pathParams.id;
      const requestId = Math.random().toString(36).substring(7);

      ctx.req.log.info('Fetching user data', { userId, requestId });

      const user = {
        id: userId,
        name: 'John Doe',
        email: 'john@example.com',
      };

      ctx.req.log.info('User data fetched successfully', { user, requestId });

      return ctx.res.json(user);
    },
  });

  return app;
}

// Performance logging - using ctx.req.log directly
export function configurePerformance(app: Kori<any, any, any, any, any>) {
  let requestCounter = 0;
  const requestTimings = new Map<string, { startTime: number; requestNumber: number }>();

  app.onRequest((ctx) => {
    const requestNumber = ++requestCounter;
    const startTime = Date.now();
    const requestKey = `${ctx.req.method}-${ctx.req.url.pathname}-${requestNumber}`;

    requestTimings.set(requestKey, { startTime, requestNumber });
    ctx.req.log.info('Request started', { requestNumber, requestKey });
  });

  app.onResponse((ctx) => {
    const endTime = Date.now();
    const requestKey = `${ctx.req.method}-${ctx.req.url.pathname}`;

    let matchingEntry: { startTime: number; requestNumber: number } | undefined;
    let matchingKey: string | undefined;

    for (const [key, value] of requestTimings.entries()) {
      if (key.startsWith(requestKey)) {
        matchingEntry = value;
        matchingKey = key;
        break;
      }
    }

    if (matchingEntry && matchingKey) {
      const duration = endTime - matchingEntry.startTime;
      ctx.req.log.info('Request completed', {
        requestNumber: matchingEntry.requestNumber,
        duration,
        category: duration < 100 ? 'fast' : duration < 500 ? 'medium' : 'slow',
      });
      requestTimings.delete(matchingKey);
    }
  });

  app.addRoute({
    method: 'GET',
    path: '/metrics',
    handler: (ctx) => {
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

// Main configure function that combines all logging examples
export function configure(app: Kori<any, any, any, any, any>) {
  // Create child apps for different logging examples
  app.createChild({
    prefix: '/simple',
    configure: configureSimple,
  });

  app.createChild({
    prefix: '/contextual',
    configure: configureContextual,
  });

  app.createChild({
    prefix: '/performance',
    configure: configurePerformance,
  });

  return app;
}

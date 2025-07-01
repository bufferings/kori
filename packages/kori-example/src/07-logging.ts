/**
 * Kori Logging Guide
 *
 * This file demonstrates logging capabilities including:
 * - Simple logging with ctx.req.log
 * - Contextual logging with structured data
 * - Performance logging and metrics
 * - Request timing and monitoring
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { type Kori, type KoriEnvironment, type KoriRequest, type KoriResponse } from 'kori';
import { type KoriZodRequestValidator, type KoriZodResponseValidator } from 'kori-zod-validator';

/**
 * Configure Logging example routes
 * This demonstrates comprehensive logging patterns and techniques
 */
export function configure<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(
  app: Kori<Env, Req, Res, KoriZodRequestValidator, KoriZodResponseValidator>,
): Kori<Env, Req, Res, KoriZodRequestValidator, KoriZodResponseValidator> {
  let requestCounter = 0;
  const requestTimings = new Map<string, { startTime: number; requestNumber: number }>();

  // Welcome route
  app.get('/', (ctx) =>
    ctx.res.json({
      message: 'Welcome to Kori Logging Examples!',
      description: 'This demonstrates various logging patterns and techniques',
      examples: [
        'Simple logging',
        'Contextual logging with structured data',
        'Performance logging and metrics',
        'Request timing and monitoring',
      ],
    }),
  );

  // Simple logging example
  app.get('/hello', (ctx) => {
    ctx.req.log.info('Processing hello request');
    ctx.req.log.debug('Debug information', { timestamp: Date.now() });
    return ctx.res.json({ message: 'Hello with simple logger' });
  });

  // Enhanced logging with context
  app.get('/user/:id', (ctx) => {
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
  });

  // Product search with logging
  app.get('/products', (ctx) => {
    const query = (ctx.req as any).queries.q ?? '';
    const category = (ctx.req as any).queries.category ?? '';
    const startTime = Date.now();

    ctx.req.log.info('Product search initiated', {
      query,
      category,
      startTime,
    });

    // Simulate search logic
    const products = [
      { id: 1, name: 'Laptop', category: 'electronics', price: 999 },
      { id: 2, name: 'Phone', category: 'electronics', price: 699 },
      { id: 3, name: 'Book', category: 'books', price: 19 },
    ].filter(
      (p) => (!query || p.name.toLowerCase().includes(query.toLowerCase())) && (!category || p.category === category),
    );

    const duration = Date.now() - startTime;

    ctx.req.log.info('Product search completed', {
      query,
      category,
      resultCount: products.length,
      duration,
      performance: duration < 50 ? 'excellent' : duration < 100 ? 'good' : 'slow',
    });

    return ctx.res.json({
      products,
      searchInfo: {
        query,
        category,
        count: products.length,
        searchTime: `${duration}ms`,
      },
    });
  });

  // Performance logging with request tracking
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

  // System metrics endpoint
  app.get('/metrics', (ctx) => {
    ctx.req.log.info('System metrics requested', {
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
      currentTimestamp: new Date().toISOString(),
    });
  });

  // Error logging example
  app.get('/error-demo', (ctx) => {
    const errorType = (ctx.req as any).queries.type ?? 'basic';

    ctx.req.log.warn('Simulating error', { errorType });

    try {
      switch (errorType) {
        case 'validation':
          throw new Error('Validation failed: Invalid input');
        case 'database':
          throw new Error('Database connection failed');
        case 'external':
          throw new Error('External API timeout');
        default:
          throw new Error('Generic error occurred');
      }
    } catch (error) {
      ctx.req.log.error('Error caught in demo endpoint', {
        error: {
          message: (error as Error).message,
          type: errorType,
        },
      });

      return ctx.res.status(500).json({
        error: 'Demonstration error',
        type: errorType,
        message: (error as Error).message,
      });
    }
  });

  // Async operation with logging
  app.post('/async-operation', async (ctx) => {
    const operationId = Math.random().toString(36).substring(7);

    ctx.req.log.info('Starting async operation', { operationId });

    try {
      // Simulate async work
      await new Promise((resolve) => setTimeout(resolve, 200));

      ctx.req.log.info('Async operation completed successfully', {
        operationId,
        result: 'success',
      });

      return ctx.res.json({
        message: 'Async operation completed',
        operationId,
        status: 'success',
      });
    } catch (error) {
      ctx.req.log.error('Async operation failed', {
        operationId,
        error: (error as Error).message,
      });

      return ctx.res.status(500).json({
        error: 'Async operation failed',
        operationId,
      });
    }
  });

  // Initialization hook
  app.onInit(() => {
    app.log.info('Logging example initialized!');
    app.log.info('Available endpoints:');
    app.log.info('   GET  /              - Welcome message');
    app.log.info('   GET  /hello         - Simple logging example');
    app.log.info('   GET  /user/:id      - Contextual logging with user data');
    app.log.info('   GET  /products      - Product search with performance logging');
    app.log.info('   GET  /metrics       - System metrics endpoint');
    app.log.info('   GET  /error-demo    - Error logging demonstration');
    app.log.info('   POST /async-operation - Async operation logging');
    app.log.info('');
    app.log.info('Performance tracking enabled for all requests');
    app.log.info('Logging example ready!');
  });

  return app;
}

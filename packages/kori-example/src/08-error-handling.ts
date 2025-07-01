/**
 * Kori Error Handling Guide
 *
 * This file demonstrates error handling capabilities including:
 * - Custom error classes and hierarchies
 * - Global error handlers with onError hooks
 * - Validation errors with detailed information
 * - Async error handling
 * - Graceful error logging and responses
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { type Kori, type KoriEnvironment, type KoriRequest, type KoriResponse } from 'kori';
import { type KoriZodRequestValidator, type KoriZodResponseValidator } from 'kori-zod-validator';

class CustomError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'CustomError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

class ValidationError extends CustomError {
  details: Record<string, unknown>;

  constructor(message: string, details: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.details = details;
  }
}

/**
 * Configure Error Handling example routes
 * This demonstrates comprehensive error handling patterns
 */
export function configure<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(
  app: Kori<Env, Req, Res, KoriZodRequestValidator, KoriZodResponseValidator>,
): Kori<Env, Req, Res, KoriZodRequestValidator, KoriZodResponseValidator> {
  // Global error handler
  app.onError((ctx, err) => {
    const error = err instanceof Error ? err : new Error(String(err));

    ctx.req.log.error('Error occurred', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      request: {
        method: ctx.req.method,
        path: ctx.req.url.pathname,
        headers: ctx.req.headers,
      },
    });

    if (!ctx.res.isSet()) {
      if (err instanceof CustomError) {
        ctx.res.status(err.statusCode).json({
          error: {
            code: err.code,
            message: err.message,
            ...(err instanceof ValidationError && { details: err.details }),
          },
        });
      } else {
        ctx.res.internalError({
          message: 'An unexpected error occurred',
        });
      }
    }
  });

  // Welcome route
  app.get('/', (ctx) =>
    ctx.res.json({
      message: 'Welcome to Kori Error Handling Examples!',
      description: 'This demonstrates various error handling patterns',
      errorTypes: [
        'Basic errors',
        'Custom errors with status codes',
        'Validation errors with details',
        'Async errors',
        'Graceful error handling',
      ],
      availableRoutes: [
        'GET /error/basic - Basic error example',
        'GET /error/custom - Custom error example',
        'GET /error/validation - Validation error example',
        'GET /error/async - Async error example',
        'GET /safe/:operation - Safe operation with error handling',
      ],
    }),
  );

  // Basic error example
  app.get('/error/basic', () => {
    throw new Error('This is a basic error');
  });

  // Custom error example
  app.get('/error/custom', () => {
    throw new CustomError('Custom error occurred', 418, 'TEAPOT');
  });

  // Validation error example
  app.get('/error/validation', () => {
    throw new ValidationError('Invalid input data', {
      fields: {
        email: 'Invalid email format',
        age: 'Must be a positive number',
      },
    });
  });

  // Async error example
  app.get('/error/async', async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    throw new Error('Async error occurred');
  });

  // Safe operation with error handling
  app.get('/safe/:operation', (ctx) => {
    const operation = ctx.req.pathParams.operation;

    try {
      switch (operation) {
        case 'divide': {
          const result = 10 / 0;
          if (!isFinite(result)) {
            throw new Error('Division by zero');
          }
          return ctx.res.json({ result });
        }

        case 'parse': {
          JSON.parse('{"invalid": json}');
          return ctx.res.json({ data: 'parsed' });
        }

        case 'network': {
          // Simulate network error
          throw new CustomError('Network timeout', 408, 'NETWORK_TIMEOUT');
        }

        case 'permission': {
          // Simulate permission error
          throw new CustomError('Access denied', 403, 'ACCESS_DENIED');
        }

        default:
          throw new CustomError('Operation not found', 404, 'NOT_FOUND');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  });

  // Handled error demonstration (won't trigger global handler)
  app.get('/handled-error', (ctx) => {
    try {
      throw new Error('This error will be handled locally');
    } catch (error) {
      ctx.req.log.warn('Handled error locally', {
        error: (error as Error).message,
      });

      return ctx.res.status(400).json({
        message: 'Error handled gracefully',
        error: (error as Error).message,
        handledBy: 'local handler',
      });
    }
  });

  // Timeout simulation
  app.get('/timeout-demo', async (ctx) => {
    const timeoutMs = parseInt((ctx.req as any).queries?.timeout ?? '5000');

    ctx.req.log.info('Starting timeout demo', { timeoutMs });

    // Simulate long-running operation
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new CustomError('Operation timeout', 408, 'TIMEOUT'));
      }, timeoutMs);

      // Simulate work completing before timeout
      if (timeoutMs < 2000) {
        clearTimeout(timer);
        resolve('completed');
      }
    });

    return ctx.res.json({
      message: 'Operation completed successfully',
      timeoutMs,
    });
  });

  // Database simulation with errors
  app.get('/database/:action', (ctx) => {
    const action = ctx.req.pathParams.action;

    switch (action) {
      case 'connect':
        // Simulate connection failure
        throw new CustomError('Database connection failed', 503, 'DB_CONNECTION_ERROR');

      case 'query':
        // Simulate query error
        throw new CustomError('Invalid SQL query', 400, 'DB_QUERY_ERROR');

      case 'timeout':
        // Simulate timeout
        throw new CustomError('Database query timeout', 408, 'DB_TIMEOUT');

      default:
        return ctx.res.json({
          message: 'Database simulation',
          action,
          availableActions: ['connect', 'query', 'timeout'],
        });
    }
  });

  // Graceful error handling child
  const gracefulChild = app.createChild({
    prefix: '/graceful',
    configure: (kori) => {
      return kori.onError((ctx, err) => {
        const errorId = `err_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const error = err instanceof Error ? err : new Error(String(err));

        ctx.req.log.error('Graceful error handler', {
          errorId,
          error,
          context: {
            url: ctx.req.url.href,
            method: ctx.req.method,
            headers: ctx.req.headers,
            timestamp: new Date().toISOString(),
          },
        });

        if (!ctx.res.isSet()) {
          ctx.res.internalError({
            message: 'Something went wrong, but we handled it gracefully',
            details: { errorId, timestamp: new Date().toISOString() },
          });
        }
      });
    },
  });

  gracefulChild.get('/test', (ctx) => {
    return ctx.res.json({
      message: 'This endpoint has graceful error handling',
      timestamp: new Date().toISOString(),
    });
  });

  gracefulChild.get('/error', () => {
    throw new Error('This will be handled by the graceful handler');
  });

  // Initialization hook
  app.onInit(() => {
    app.log.info('Error Handling example initialized!');
    app.log.info('Available endpoints:');
    app.log.info('   GET  /              - Welcome message');
    app.log.info('   GET  /error/basic   - Basic error (500)');
    app.log.info('   GET  /error/custom  - Custom error (418)');
    app.log.info('   GET  /error/validation - Validation error (400)');
    app.log.info('   GET  /error/async   - Async error (500)');
    app.log.info('   GET  /safe/:operation - Safe operations (divide, parse, network, permission)');
    app.log.info('   GET  /handled-error - Locally handled error');
    app.log.info('   GET  /timeout-demo  - Timeout simulation');
    app.log.info('   GET  /database/:action - Database error simulation');
    app.log.info('   GET  /graceful/test - Graceful error handling');
    app.log.info('   GET  /graceful/error - Graceful error handling demo');
    app.log.info('');
    app.log.info('Global error handler configured');
    app.log.info('Error Handling example ready!');
  });

  return app;
}

import { createKori } from 'kori';
import type { KoriEnvironment, KoriHandlerContext, KoriRequest, KoriResponse } from 'kori';

type KoriApp = ReturnType<typeof createKori>;
type Ctx = KoriHandlerContext<KoriEnvironment, KoriRequest, KoriResponse>;

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

export function configure(app: KoriApp): KoriApp {

app.onError((ctx: Ctx, err: unknown) => {
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

app.addRoute({
  method: 'GET',
  path: '/error/basic',
  handler: () => {
    throw new Error('This is a basic error');
  },
});

app.addRoute({
  method: 'GET',
  path: '/error/custom',
  handler: () => {
    throw new CustomError('Custom error occurred', 418, 'TEAPOT');
  },
});

app.addRoute({
  method: 'GET',
  path: '/error/validation',
  handler: () => {
    throw new ValidationError('Invalid input data', {
      fields: {
        email: 'Invalid email format',
        age: 'Must be a positive number',
      },
    });
  },
});

app.addRoute({
  method: 'GET',
  path: '/error/async',
  handler: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    throw new Error('Async error occurred');
  },
});

app.addRoute({
  method: 'GET',
  path: '/safe/:operation',
  handler: (ctx) => {
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

        default:
          throw new CustomError('Operation not found', 404, 'NOT_FOUND');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  },
});

// Graceful error handling
const gracefulApp = createKori();

gracefulApp.onError((ctx, err) => {
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const error = err instanceof Error ? err : new Error(String(err));

  ctx.req.log.error('Error logged', {
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
      message: 'Something went wrong',
      details: { errorId, timestamp: new Date().toISOString() },
    });
  }
});

gracefulApp.addRoute({
  method: 'GET',
  path: '/safe',
  handler: (ctx) => {
    return ctx.res.json({
      message: 'This endpoint handles errors gracefully',
      timestamp: new Date().toISOString(),
    });
  },
});

return app;
}

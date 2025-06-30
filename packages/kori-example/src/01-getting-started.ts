/**
 * Kori Getting Started Guide
 *
 * In this file, we'll learn the basic usage of the Kori framework
 * step by step.
 */

import { createKori } from 'kori';
import { zodRequest } from 'kori-zod-schema';
import { z } from 'zod';

type KoriApp = ReturnType<typeof createKori>;

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const CreateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be less than 50 characters'),
  email: z.string().email('Invalid email format'),
  age: z
    .number()
    .int('Age must be an integer')
    .min(0, 'Age must be positive')
    .max(120, 'Age seems unrealistic')
    .optional(),
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function configure(app: KoriApp): KoriApp {
  // 1. Hello-world route
  app.get('/', (ctx) =>
    ctx.res.json({
      message: 'Welcome to Kori!',
      timestamp: new Date().toISOString(),
    }),
  );

  // 2. Path-parameter demo
  app.get('/hello/:name', (ctx) => {
    const { name } = ctx.req.pathParams;
    ctx.req.log.info('Greeting request received', { name });

    return ctx.res.json({
      greeting: `Hello, ${name}!`,
      tip: 'Try: /hello/your-name',
    });
  });

  // 3. Query-parameter demo
  app.get('/search', (ctx) => {
    const { q, limit = '10' } = ctx.req.queryParams;
    const queryString = Array.isArray(q) ? q[0] : q;

    ctx.req.log.info('Search request', { query: queryString, limit });

    if (!queryString) {
      return ctx.res.badRequest({
        message: 'Query parameter "q" is required',
        details: '/search?q=kori&limit=5',
      });
    }

    return ctx.res.json({
      query: queryString,
      limit: parseInt(limit as string, 10),
      results: [`Result 1 for "${queryString}"`, `Result 2 for "${queryString}"`],
      tip: 'Try: /search?q=typescript&limit=3',
    });
  });

  // 4. POST with body validation example
  app.post('/users', {
    requestSchema: zodRequest({
      body: CreateUserSchema,
    }),
    handler: (ctx) => {
      const userData = ctx.req.validated.body;
      const newUser = {
        id: Math.floor(Math.random() * 10000),
        ...userData,
        createdAt: new Date().toISOString(),
      };

      ctx.req.log.info('User created successfully', {
        userId: newUser.id,
        email: newUser.email,
      });

      return ctx.res.status(201).json({
        message: 'User created successfully',
        user: newUser,
        tip: 'Try sending: {"name": "Alice", "email": "alice@example.com", "age": 25}',
      });
    },
  });

  // 5. About route via addRoute
  app.addRoute({
    method: 'GET',
    path: '/about',
    handler: (ctx) =>
      ctx.res.json({
        message: 'This route uses addRoute instead of method aliases',
        note: 'Both app.get() and app.addRoute() are valid approaches',
      }),
  });

  // 6. Global error handler (kept minimal for demo purposes)
  app.onError((ctx, err) => {
    ctx.req.log.error('Request failed', {
      error: (err as Error).message,
      path: ctx.req.url.pathname,
      method: ctx.req.method,
    });

    if (!ctx.res.isSet()) {
      ctx.res.internalError({
        message: 'Something went wrong',
        details: 'Please try again or contact support',
      });
    }
  });

  // 7. Startup log helper
  app.onInit(() => {
    app.log.info('Kori "Getting Started" example initialised');
  });

  return app;
}

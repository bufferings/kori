/**
 * Kori Getting Started Guide
 *
 * In this file, we'll learn the basic usage of the Kori framework
 * step by step.
 */

import { type Kori, type KoriEnvironment, type KoriRequest, type KoriResponse } from 'kori';
import { zodRequest } from 'kori-zod-schema';
import { type KoriZodRequestValidator, type KoriZodResponseValidator } from 'kori-zod-validator';
import { z } from 'zod';

// Request validation schema
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

/**
 * Configure Getting Started example routes
 * This demonstrates basic Kori framework usage patterns
 */
export function configure<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(
  app: Kori<Env, Req, Res, KoriZodRequestValidator, KoriZodResponseValidator>,
): Kori<Env, Req, Res, KoriZodRequestValidator, KoriZodResponseValidator> {
  // Simple route - Hello World
  app.get('/', (ctx) =>
    ctx.res.json({
      message: 'Welcome to Kori Getting Started!',
      timestamp: new Date().toISOString(),
      description: 'This example demonstrates basic Kori framework usage',
    }),
  );

  // Path parameters
  app.get('/hello/:name', (ctx) => {
    const { name } = ctx.req.pathParams;

    ctx.req.log.info('Greeting request received', { name });

    return ctx.res.json({
      greeting: `Hello, ${name}!`,
      tip: 'Try: /hello/your-name',
      example: 'Path parameter extraction',
    });
  });

  // Query parameters
  app.get('/search', (ctx) => {
    const { q, limit = '10' } = ctx.req.queryParams;
    const queryString = Array.isArray(q) ? q[0] : q;

    ctx.req.log.info('Search request', { query: queryString, limit });

    if (!queryString) {
      return ctx.res.badRequest({
        type: 'json',
        message: 'Query parameter "q" is required',
        details: '/search?q=kori&limit=5',
      });
    }

    return ctx.res.json({
      query: queryString,
      limit: parseInt(limit as string),
      results: [`Result 1 for "${queryString}"`, `Result 2 for "${queryString}"`],
      tip: 'Try: /search?q=typescript&limit=3',
    });
  });

  // Request validation with Zod
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
        tip: 'Send: {"name": "Alice", "email": "alice@example.com", "age": 25}',
      });
    },
  });

  // Using addRoute API
  app.addRoute({
    method: 'GET',
    path: '/about',
    handler: (ctx) => {
      return ctx.res.json({
        message: 'This route demonstrates addRoute API',
        note: 'Both app.get() and app.addRoute() are valid approaches',
        framework: 'Kori',
      });
    },
  });

  // Error handling
  app.onError((ctx, err) => {
    ctx.req.log.error('Request failed', {
      error: (err as Error).message,
      path: ctx.req.url.pathname,
      method: ctx.req.method,
    });

    if (!ctx.res.isSet()) {
      ctx.res.internalError({
        message: 'Something went wrong in Getting Started example',
        details: 'Please try again or contact support',
      });
    }
  });

  // Initialization hook
  app.onInit(() => {
    app.log.info('Getting Started example initialized!');
    app.log.info('Available endpoints:');
    app.log.info('   GET  /              - Welcome message');
    app.log.info('   GET  /hello/:name   - Personalized greeting');
    app.log.info('   GET  /search?q=...  - Search with query params');
    app.log.info('   POST /users         - Create user with validation');
    app.log.info('   GET  /about         - About page');
    app.log.info('');
    app.log.info('Getting Started example ready!');
  });

  return app;
}

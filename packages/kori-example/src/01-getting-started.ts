/**
 * Kori Getting Started Guide
 *
 * In this file, we'll learn the basic usage of the Kori framework
 * step by step.
 */

import { createKori } from 'kori';
import { zodRequest } from 'kori-zod-schema';
import { createKoriZodRequestValidator } from 'kori-zod-validator';
import { z } from 'zod';

// 1. Creating a Kori application
// Setting up request validation functionality as well
const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
});

// 2. The simplest route - Hello World
app.get('/', (ctx) =>
  ctx.res.json({
    message: 'Welcome to Kori!',
    timestamp: new Date().toISOString(),
  }),
);

// 3. Using path parameters
app.get('/hello/:name', (ctx) => {
  const { name } = ctx.req.pathParams;

  // Output logs to track requests
  ctx.req.log.info('Greeting request received', { name });

  return ctx.res.json({
    greeting: `Hello, ${name}!`,
    tip: 'Try: /hello/your-name',
  });
});

// 4. Processing query parameters
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
    limit: parseInt(limit as string),
    results: [`Result 1 for "${queryString}"`, `Result 2 for "${queryString}"`],
    tip: 'Try: /search?q=typescript&limit=3',
  });
});

// 5. Request validation - Defining Zod schema
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

// 6. POST request with validation
app.post('/users', {
  requestSchema: zodRequest({
    body: CreateUserSchema,
  }),
  handler: (ctx) => {
    // Validated data can be accessed with type safety
    const userData = ctx.req.validated.body;

    // Create new user (in real app, would save to DB)
    const newUser = {
      id: Math.floor(Math.random() * 10000),
      ...userData,
      createdAt: new Date().toISOString(),
    };

    // Track user creation with structured logging
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

// 7. Error handling (including validation errors)
app.onError((ctx, err) => {
  // Log error details
  ctx.req.log.error('Request failed', {
    error: (err as Error).message,
    path: ctx.req.url.pathname,
    method: ctx.req.method,
  });

  // Send error response only if response is not already set
  if (!ctx.res.isSet()) {
    ctx.res.internalError({
      message: 'Something went wrong',
      details: 'Please try again or contact support',
    });
  }
});

app.addRoute({
  method: 'GET',
  path: '/about',
  handler: (ctx) => {
    return ctx.res.json({
      message: 'This route uses addRoute instead of method aliases',
      note: 'Both app.get() and app.addRoute() are valid approaches',
    });
  },
});

// 9. Application startup processing
app.onInit(() => {
  app.log.info('Kori application initialized!');
  app.log.info('Available endpoints:');
  app.log.info('   GET  /              - Welcome message (method alias)');
  app.log.info('   GET  /hello/:name   - Personalized greeting (method alias)');
  app.log.info('   GET  /search?q=...  - Search with query params (method alias)');
  app.log.info('   POST /users         - Create user with validation (method alias)');
  app.log.info('   GET  /about         - About page (addRoute example)');
  app.log.info('');
  app.log.info('Tip: Both method aliases (app.get, app.post) and addRoute are supported!');
});

export default app;

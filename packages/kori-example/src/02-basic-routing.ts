/**
 * Kori Basic Routing Guide
 *
 * This file demonstrates basic routing capabilities including:
 * - HTTP methods (GET, POST, PUT, DELETE)
 * - Path parameters
 * - Query parameters
 * - Different response types
 */

import { type Kori, type KoriEnvironment, type KoriRequest, type KoriResponse } from 'kori';
import { type KoriZodRequestValidator, type KoriZodResponseValidator } from 'kori-zod-validator';

/**
 * Configure Basic Routing example routes
 * This demonstrates core routing functionality
 */
export function configure<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(
  app: Kori<Env, Req, Res, KoriZodRequestValidator, KoriZodResponseValidator>,
): Kori<Env, Req, Res, KoriZodRequestValidator, KoriZodResponseValidator> {
  // Simple route
  app.get('/', (ctx) =>
    ctx.res.json({
      message: 'Hello, Kori Basic Routing!',
      description: 'This example demonstrates basic routing functionality',
    }),
  );

  // Path parameters
  app.get('/hello/:name', (ctx) => {
    const name = ctx.req.pathParams.name;
    return ctx.res.json({
      message: `Hello, ${name}!`,
      example: 'Path parameter extraction',
    });
  });

  // GET with JSON response
  app.get('/users', (ctx) => {
    const users = [
      { id: 1, name: 'Alice', role: 'admin' },
      { id: 2, name: 'Bob', role: 'user' },
      { id: 3, name: 'Charlie', role: 'user' },
    ];
    return ctx.res.json(users);
  });

  // POST with JSON body
  app.post('/users', async (ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    const body = (await ctx.req.json()) as any;
    return ctx.res.status(201).json({
      message: 'User created',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      user: { id: Math.floor(Math.random() * 1000), ...body },
    });
  });

  // PUT with path parameters and body
  app.put('/users/:id', async (ctx) => {
    const id = ctx.req.pathParams.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    const body = (await ctx.req.json()) as any;
    return ctx.res.json({
      message: `User ${id} updated`,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      user: { id: parseInt(id), ...body },
    });
  });

  // DELETE with path parameters
  app.delete('/users/:id', (ctx) => {
    const id = ctx.req.pathParams.id;
    return ctx.res.json({
      message: `User ${id} deleted`,
      deletedId: parseInt(id),
    });
  });

  // Query parameters
  app.get('/query', (ctx) => {
    const query = ctx.req.queryParams;
    return ctx.res.json({
      query,
      tip: 'Try: /query?name=Alice&age=25&active=true',
    });
  });

  // Request headers
  app.get('/headers', (ctx) => {
    const userAgent = ctx.req.headers['user-agent'];
    const customHeader = ctx.req.headers['x-custom-header'];
    return ctx.res.json({
      userAgent,
      customHeader,
      tip: 'Send X-Custom-Header to see it reflected',
    });
  });

  // Different response types
  app.get('/text', (ctx) => ctx.res.text('This is a plain text response from Basic Routing'));

  app.get('/html', (ctx) => ctx.res.html('<h1>Hello from Kori Basic Routing!</h1><p>This is an HTML response.</p>'));

  app.get('/empty', (ctx) => ctx.res.empty(204));

  app.get('/status', (ctx) =>
    ctx.res.status(418).json({
      message: "I'm a teapot",
      code: 418,
      example: 'Custom HTTP status codes',
    }),
  );

  // Using addRoute API
  app.addRoute({
    method: 'GET',
    path: '/alternative',
    handler: (ctx) => {
      return ctx.res.json({
        message: 'This route uses addRoute API',
        note: 'Both app.get() and app.addRoute() are valid approaches',
        example: 'Alternative routing syntax',
      });
    },
  });

  // Error handling
  app.onError((ctx, _err) => {
    if (!ctx.res.isSet()) {
      ctx.res.notFound({
        message: 'Route not found in Basic Routing example',
      });
    }
  });

  // Initialization hook
  app.onInit(() => {
    app.log.info('Basic Routing example initialized!');
    app.log.info('Available endpoints:');
    app.log.info('   GET    /           - Welcome message');
    app.log.info('   GET    /hello/:name - Path parameters');
    app.log.info('   GET    /users      - List users');
    app.log.info('   POST   /users      - Create user');
    app.log.info('   PUT    /users/:id  - Update user');
    app.log.info('   DELETE /users/:id  - Delete user');
    app.log.info('   GET    /query      - Query parameters');
    app.log.info('   GET    /headers    - Request headers');
    app.log.info('   GET    /text       - Text response');
    app.log.info('   GET    /html       - HTML response');
    app.log.info('   GET    /empty      - Empty response');
    app.log.info('   GET    /status     - Custom status');
    app.log.info('   GET    /alternative - addRoute API');
    app.log.info('');
    app.log.info('Basic Routing example ready!');
  });

  return app;
}

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
  k: Kori<Env, Req, Res, KoriZodRequestValidator, KoriZodResponseValidator>,
): Kori<Env, Req, Res, KoriZodRequestValidator, KoriZodResponseValidator> {
  // Simple route
  k.get('/', (ctx) =>
    ctx.res.json({
      message: 'Hello, Kori Basic Routing!',
      description: 'This example demonstrates basic routing functionality',
    }),
  );

  // Path parameters
  k.get('/hello/:name', (ctx) => {
    const name = ctx.req.pathParams.name;
    return ctx.res.json({
      message: `Hello, ${name}!`,
      example: 'Path parameter extraction',
    });
  });

  // GET with JSON response
  k.get('/users', (ctx) => {
    const users = [
      { id: 1, name: 'Alice', role: 'admin' },
      { id: 2, name: 'Bob', role: 'user' },
      { id: 3, name: 'Charlie', role: 'user' },
    ];
    return ctx.res.json(users);
  });

  // POST with JSON body
  k.post('/users', async (ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    const body = (await ctx.req.json()) as any;
    return ctx.res.status(201).json({
      message: 'User created',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      user: { id: Math.floor(Math.random() * 1000), ...body },
    });
  });

  // PUT with path parameters and body
  k.put('/users/:id', async (ctx) => {
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
  k.delete('/users/:id', (ctx) => {
    const id = ctx.req.pathParams.id;
    return ctx.res.json({
      message: `User ${id} deleted`,
      deletedId: parseInt(id),
    });
  });

  // Query parameters
  k.get('/query', (ctx) => {
    const query = ctx.req.queryParams;
    return ctx.res.json({
      query,
      tip: 'Try: /query?name=Alice&age=25&active=true',
    });
  });

  // Request headers
  k.get('/headers', (ctx) => {
    const userAgent = ctx.req.headers['user-agent'];
    const customHeader = ctx.req.headers['x-custom-header'];
    return ctx.res.json({
      userAgent,
      customHeader,
      tip: 'Send X-Custom-Header to see it reflected',
    });
  });

  // Different response types
  k.get('/text', (ctx) => ctx.res.text('This is a plain text response from Basic Routing'));

  k.get('/html', (ctx) => ctx.res.html('<h1>Hello from Kori Basic Routing!</h1><p>This is an HTML response.</p>'));

  k.get('/empty', (ctx) => ctx.res.empty(204));

  k.get('/status', (ctx) =>
    ctx.res.status(418).json({
      message: "I'm a teapot",
      code: 418,
      example: 'Custom HTTP status codes',
    }),
  );

  // Using addRoute API
  k.addRoute({
    method: 'GET',
    path: '/alternative',
    handler: (ctx) =>
      ctx.res.json({
        message: 'This route uses addRoute API',
        note: 'Both app.get() and app.addRoute() are valid approaches',
        example: 'Alternative routing syntax',
      }),
  });

  // Error handling
  k.onError((ctx, _err) => {
    if (!ctx.res.isSet()) {
      ctx.res.notFound({
        message: 'Route not found in Basic Routing example',
      });
    }
  });

  // Initialization hook
  k.onInit(() => {
    k.log.info('Basic Routing example initialized!');
    k.log.info('Available endpoints:');
    k.log.info('   GET    /           - Welcome message');
    k.log.info('   GET    /hello/:name - Path parameters');
    k.log.info('   GET    /users      - List users');
    k.log.info('   POST   /users      - Create user');
    k.log.info('   PUT    /users/:id  - Update user');
    k.log.info('   DELETE /users/:id  - Delete user');
    k.log.info('   GET    /query      - Query parameters');
    k.log.info('   GET    /headers    - Request headers');
    k.log.info('   GET    /text       - Text response');
    k.log.info('   GET    /html       - HTML response');
    k.log.info('   GET    /empty      - Empty response');
    k.log.info('   GET    /status     - Custom status');
    k.log.info('   GET    /alternative - addRoute API');
    k.log.info('');
    k.log.info('Basic Routing example ready!');
  });

  return k;
}

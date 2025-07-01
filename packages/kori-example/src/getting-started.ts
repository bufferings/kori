import { createKori } from 'kori';
import { startNodeServer } from 'kori-nodejs-adapter';
import { scalarUIPlugin } from 'kori-openapi-ui-scalar';
import { zodOpenApiPlugin, openApiMeta } from 'kori-zod-openapi-plugin';
import { zodRequest } from 'kori-zod-schema';
import { createKoriZodRequestValidator, createKoriZodResponseValidator } from 'kori-zod-validator';
import { z } from 'zod';

// User schema for validation
const UserSchema = z.object({
  name: z.string().min(1).max(100).describe('User name'),
  email: z.string().email().describe('Email address'),
});

// Create app with OpenAPI documentation
const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
  responseValidator: createKoriZodResponseValidator(),
})
  .applyPlugin(
    zodOpenApiPlugin({
      info: {
        title: 'Kori Getting Started',
        version: '1.0.0',
        description: 'Learn Kori basics with simple examples',
      },
      servers: [{ url: 'http://localhost:3000', description: 'Development server' }],
    }),
  )
  .applyPlugin(
    scalarUIPlugin({
      path: '/',
      title: 'Kori Getting Started API',
      theme: 'auto',
    }),
  );

// Basic route
app.get('/hello/:name', {
  pluginMetadata: openApiMeta({
    summary: 'Say hello',
    description: 'Returns a personalized greeting',
    tags: ['Basic'],
  }),
  handler: (ctx) => {
    const { name } = ctx.req.pathParams;
    return ctx.res.json({
      message: `Hello, ${name}!`,
      timestamp: new Date().toISOString(),
    });
  },
});

// CRUD operations with validation
app.post('/users', {
  pluginMetadata: openApiMeta({
    summary: 'Create user',
    description: 'Create a new user with validation',
    tags: ['Users'],
  }),
  requestSchema: zodRequest({
    body: UserSchema,
  }),
  handler: (ctx) => {
    const { name, email } = ctx.req.validated.body;
    const newUser = {
      id: Math.floor(Math.random() * 1000),
      name,
      email,
      createdAt: new Date().toISOString(),
    };
    return ctx.res.status(201).json(newUser);
  },
});

app.get('/users', {
  pluginMetadata: openApiMeta({
    summary: 'List users',
    description: 'Get all users',
    tags: ['Users'],
  }),
  handler: (ctx) => {
    const users = [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' },
    ];
    return ctx.res.json({ users });
  },
});

// Child instances for API versioning
app.createChild({
  prefix: '/api/v1',
  configure: (k) =>
    k.get('/status', {
      pluginMetadata: openApiMeta({
        summary: 'API v1 Status',
        description: 'Get API version 1 status',
        tags: ['API v1'],
      }),
      handler: (ctx) =>
        ctx.res.json({
          version: 'v1',
          status: 'stable',
          message: 'API version 1 is running',
        }),
    }),
});

app.createChild({
  prefix: '/api/v2',
  configure: (k) =>
    k.get('/status', {
      pluginMetadata: openApiMeta({
        summary: 'API v2 Status',
        description: 'Get API version 2 status',
        tags: ['API v2'],
      }),
      handler: (ctx) =>
        ctx.res.json({
          version: 'v2',
          status: 'beta',
          message: 'API version 2 with enhanced features',
          features: ['improved-validation', 'better-performance'],
        }),
    }),
});

// Initialize server
app.onInit(() => {
  app.log.info('Kori Getting Started Server');
  app.log.info('API Documentation: http://localhost:3000');
  app.log.info('Try these endpoints:');
  app.log.info('  GET  /hello/World');
  app.log.info('  POST /users (with JSON: {"name": "Alice", "email": "alice@example.com"})');
  app.log.info('  GET  /users');
  app.log.info('  GET  /api/v1/status');
  app.log.info('  GET  /api/v2/status');
});

await startNodeServer(app, { port: 3000, host: 'localhost' });
app.log.info('Server running at http://localhost:3000');

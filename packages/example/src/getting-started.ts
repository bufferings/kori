import { createKori, HttpStatus } from '@korix/kori';
import { startNodeServer } from '@korix/nodejs-adapter';
import { scalarUiPlugin } from '@korix/openapi-scalar-ui-plugin';
import { zodOpenApiPlugin, openApiMeta } from '@korix/zod-openapi-plugin';
import { zodRequestSchema } from '@korix/zod-schema';
import { createKoriZodRequestValidator, createKoriZodResponseValidator } from '@korix/zod-validator';
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string().min(1).max(100).meta({ description: 'User name' }),
  age: z.number().int().min(0).meta({ description: 'User age' }),
});

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
    scalarUiPlugin({
      path: '/',
      title: 'Kori Getting Started API',
      theme: 'auto',
    }),
  );

app.get('/hello/:name', {
  pluginMetadata: openApiMeta({
    summary: 'Say hello',
    description: 'Returns a personalized greeting',
    tags: ['Basic'],
  }),
  handler: (ctx) => {
    const { name } = ctx.req.pathParams();
    return ctx.res.json({
      message: `Hello, ${name}!`,
      timestamp: new Date().toISOString(),
    });
  },
});

app.post('/users', {
  pluginMetadata: openApiMeta({
    summary: 'Create user',
    description: 'Create a new user with validation',
    tags: ['Users'],
  }),
  requestSchema: zodRequestSchema({
    body: UserSchema,
  }),
  handler: (ctx) => {
    const { name, age } = ctx.req.validatedBody();
    const newUser = {
      id: Math.floor(Math.random() * 1000),
      name,
      age,
      createdAt: new Date().toISOString(),
    };
    return ctx.res.status(HttpStatus.CREATED).json(newUser);
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
      { id: 1, name: 'Alice', age: 28 },
      { id: 2, name: 'Bob', age: 35 },
    ];
    return ctx.res.json({ users });
  },
});

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

await startNodeServer(app, { port: 3000, hostname: 'localhost' });

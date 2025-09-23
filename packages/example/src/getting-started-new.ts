import { createKori, HttpStatus } from '@korix/kori';
import { scalarUiPlugin } from '@korix/openapi-scalar-ui-plugin';
import { zodOpenApiPlugin, openApiMeta } from '@korix/zod-openapi-plugin';
import { zodSchemaRequest, enableZodRequestValidation } from '@korix/zod-schema-adapter';
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string().min(1).max(100).meta({ description: 'User name' }),
  age: z.number().int().min(0).meta({ description: 'User age' }),
});

export const app = createKori({
  ...enableZodRequestValidation({
    onRequestValidationFailure: (ctx, _reason) => {
      return ctx.res.badRequest({ message: 'Validation failed' });
    },
  }),
})
  .applyPlugin(
    zodOpenApiPlugin({
      info: {
        title: 'Kori Getting Started',
        version: '1.0.0',
        description: 'A simple example API built with Kori',
      },
    }),
  )
  .applyPlugin(
    scalarUiPlugin({
      path: '/docs',
      title: 'Kori Getting Started API',
    }),
  )
  .get('/', {
    handler: (ctx) => {
      return ctx.res.json({
        message: 'Hello from Kori!',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    },
  })
  .get('/health', {
    handler: (ctx) => {
      return ctx.res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    },
  })
  .post('/users', {
    pluginMetadata: openApiMeta({
      summary: 'Create a new user',
      description: 'Creates a new user with the provided data',
      tags: ['users'],
    }),
    requestSchema: zodSchemaRequest({
      body: UserSchema,
    }),
    handler: (ctx) => {
      const user = ctx.req.validatedBody();
      const id = Math.random().toString(36).substring(2, 9);

      return ctx.res.status(HttpStatus.CREATED).json({
        id,
        ...user,
        createdAt: new Date().toISOString(),
      });
    },
  })
  .get('/users/main/:id', {
    pluginMetadata: openApiMeta({
      summary: 'Get user by ID',
      description: 'Retrieves a user by their ID',
      tags: ['users'],
    }),
    requestSchema: zodSchemaRequest({
      params: z.object({
        id: z.string().min(1).meta({ description: 'User ID' }),
      }),
    }),
    handler: (ctx) => {
      const { id } = ctx.req.validatedParams();

      return ctx.res.json({
        id,
        name: 'John Doe',
        age: 30,
        createdAt: '2024-01-01T00:00:00.000Z',
      });
    },
  });

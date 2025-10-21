/**
 * Kori Getting Started - Starter Guide
 *
 * This example demonstrates the basic features of Kori:
 * - Simple route definitions
 * - Path parameters and query parameters
 * - Request body validation with Zod
 * - Cookie handling
 * - OpenAPI documentation with Scalar UI
 *
 * Run: pnpm dev:getting-started
 * Then open: http://localhost:3000
 */

import { createKori, HttpStatus } from '@korix/kori';
import { startNodejsServer } from '@korix/nodejs-server';
import { swaggerUiPlugin } from '@korix/openapi-swagger-ui-plugin';
import { zodOpenApiPlugin, openApiMeta } from '@korix/zod-openapi-plugin';
import { zodRequestSchema, zodResponseSchema, enableZodRequestValidation } from '@korix/zod-schema-adapter';
import { z } from 'zod';

// ============================================================================
// Application Setup
// ============================================================================

const app = createKori({
  ...enableZodRequestValidation(),
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
    swaggerUiPlugin({
      path: '/',
      title: 'Kori Getting Started API',
    }),
  );

// ============================================================================
// Basic Routes
// ============================================================================

// Simple greeting endpoint
app.get('/hello/:name', {
  pluginMeta: openApiMeta({
    summary: 'Say hello',
    description: 'Returns a personalized greeting',
    tags: ['Basics'],
  }),
  requestSchema: zodRequestSchema({
    params: z.object({
      name: z.string().min(1).meta({ description: 'Name to greet' }),
    }),
  }),
  responseSchema: zodResponseSchema({
    '200': z.object({
      message: z.string().meta({ description: 'Greeting message' }),
      timestamp: z.string().meta({ description: 'ISO 8601 timestamp' }),
    }),
  }),
  handler: (ctx) => {
    const { name } = ctx.req.params();

    return ctx.res.json({
      message: `Hello, ${name}!`,
      timestamp: new Date().toISOString(),
    });
  },
});

// Endpoint with query parameters
app.get('/search', {
  pluginMeta: openApiMeta({
    summary: 'Search endpoint',
    description: 'Demonstrates query parameter handling',
    tags: ['Basics'],
  }),
  requestSchema: zodRequestSchema({
    queries: z.object({
      q: z.string().min(1).meta({ description: 'Search query' }),
      limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default(10),
    }),
  }),
  responseSchema: zodResponseSchema({
    '200': z.object({
      query: z.string().meta({ description: 'The search query' }),
      limit: z.number().meta({ description: 'Results limit' }),
      results: z.array(z.string()).meta({ description: 'Search results' }),
    }),
  }),
  handler: (ctx) => {
    const { q, limit } = ctx.req.validatedQueries();

    return ctx.res.json({
      query: q,
      limit,
      results: [`Result 1 for "${q}"`, `Result 2 for "${q}"`],
    });
  },
});

// ============================================================================
// User Management Routes
// ============================================================================

// Define user schema for validation
const UserSchema = z.object({
  name: z.string().min(1).max(100).meta({ description: 'User name' }),
  age: z.number().int().min(0).max(150).meta({ description: 'User age' }),
});

// Create a new user
app.post('/users', {
  pluginMeta: openApiMeta({
    summary: 'Create user',
    description: 'Create a new user with validation',
    tags: ['Users'],
  }),
  requestSchema: zodRequestSchema({
    body: UserSchema,
  }),
  responseSchema: zodResponseSchema({
    '201': UserSchema.extend({
      id: z.number().meta({ description: 'User ID' }),
      createdAt: z.string().meta({ description: 'Creation timestamp' }),
    }),
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

// Get user by ID
app.get('/users/:id', {
  pluginMeta: openApiMeta({
    summary: 'Get user',
    description: 'Get user by ID',
    tags: ['Users'],
  }),
  requestSchema: zodRequestSchema({
    params: z.object({
      id: z.string().min(1).meta({ description: 'User ID' }),
    }),
  }),
  responseSchema: zodResponseSchema({
    '200': z.object({
      id: z.string().meta({ description: 'User ID' }),
      name: z.string().meta({ description: 'User name' }),
      age: z.number().meta({ description: 'User age' }),
      pathTemplate: z.string().meta({ description: 'Route pattern' }),
    }),
  }),
  handler: (ctx) => {
    const { id } = ctx.req.validatedParams();

    // In a real app, you would fetch from database
    return ctx.res.json({
      id,
      name: 'Alice',
      age: 28,
      pathTemplate: ctx.req.pathTemplate(), // Shows the route pattern
    });
  },
});

// List all users
app.get('/users', {
  pluginMeta: openApiMeta({
    summary: 'List users',
    description: 'Get all users',
    tags: ['Users'],
  }),
  responseSchema: zodResponseSchema({
    '200': z.object({
      users: z
        .array(
          z.object({
            id: z.number().meta({ description: 'User ID' }),
            name: z.string().meta({ description: 'User name' }),
            age: z.number().meta({ description: 'User age' }),
          }),
        )
        .meta({ description: 'List of users' }),
    }),
  }),
  handler: (ctx) => {
    const users = [
      { id: 1, name: 'Alice', age: 28 },
      { id: 2, name: 'Bob', age: 35 },
    ];

    return ctx.res.json({ users });
  },
});

// ============================================================================
// Start Server
// ============================================================================

await startNodejsServer(app, { port: 3000, hostname: 'localhost' });

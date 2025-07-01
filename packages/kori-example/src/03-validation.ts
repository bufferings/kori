/**
 * Kori Validation Guide
 *
 * This file demonstrates request validation capabilities including:
 * - Zod schema validation
 * - Body, params, query, and header validation
 * - Partial schemas
 * - Complex nested objects
 */

import { type Kori, type KoriEnvironment, type KoriRequest, type KoriResponse } from 'kori';
import { zodRequest } from 'kori-zod-schema';
import { type KoriZodRequestValidator, type KoriZodResponseValidator } from 'kori-zod-validator';
import { z } from 'zod';

// Schema definitions
const UserSchema = z.object({
  name: z.string().min(1).max(100).describe('User full name'),
  email: z.string().email().describe('User email address'),
  age: z.number().int().min(0).max(150).describe('User age'),
});

const UpdateUserSchema = UserSchema.partial();

const QuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1').describe('Page number'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10').describe('Items per page'),
  sort: z.enum(['asc', 'desc']).optional().describe('Sort order'),
});

const ProductSchema = z.object({
  name: z.string().describe('Product name'),
  price: z.number().positive().describe('Product price'),
  inStock: z.boolean().describe('Product availability'),
});

/**
 * Configure Validation example routes
 * This demonstrates comprehensive validation patterns
 */
export function configure<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(
  app: Kori<Env, Req, Res, KoriZodRequestValidator, KoriZodResponseValidator>,
): Kori<Env, Req, Res, KoriZodRequestValidator, KoriZodResponseValidator> {
  // Welcome route
  app.get('/', (ctx) =>
    ctx.res.json({
      message: 'Welcome to Kori Validation Examples!',
      description: 'This example demonstrates comprehensive request validation',
      features: ['Body validation', 'Query validation', 'Param validation', 'Header validation'],
    }),
  );

  // POST with body validation
  app.post('/users', {
    requestSchema: zodRequest({
      body: UserSchema,
    }),
    handler: (ctx) => {
      const body = ctx.req.validated.body;
      return ctx.res.status(201).json({
        message: 'User created successfully',
        user: { id: Math.floor(Math.random() * 1000), ...body },
      });
    },
  });

  // PUT with body and params validation
  app.put('/users/:id', {
    requestSchema: zodRequest({
      body: UpdateUserSchema,
      params: z.object({
        id: z.string().regex(/^\d+$/).describe('User ID'),
      }),
    }),
    handler: (ctx) => {
      const body = ctx.req.validated.body;
      const params = ctx.req.validated.params;
      return ctx.res.json({
        message: `User ${params.id} updated successfully`,
        user: { id: parseInt(params.id), ...body },
      });
    },
  });

  // GET with query validation
  app.get('/users', {
    requestSchema: zodRequest({
      queries: QuerySchema,
    }),
    handler: (ctx) => {
      const query = ctx.req.validated.queries;
      const users = [
        { id: 1, name: 'Alice', email: 'alice@example.com', age: 25 },
        { id: 2, name: 'Bob', email: 'bob@example.com', age: 30 },
        { id: 3, name: 'Charlie', email: 'charlie@example.com', age: 35 },
      ];

      const start = (query.page - 1) * query.limit;
      const end = start + query.limit;
      const paginatedUsers = users.slice(start, end);

      if (query.sort === 'desc') {
        paginatedUsers.reverse();
      }

      return ctx.res.json({
        users: paginatedUsers,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: users.length,
        },
      });
    },
  });

  // Complex validation with headers and nested objects
  app.addRoute({
    method: 'POST',
    path: '/complex',
    requestSchema: zodRequest({
      body: z.object({
        tags: z.array(z.string()).describe('List of tags'),
        metadata: z.record(z.string(), z.any()).describe('Additional metadata'),
        settings: z.object({
          notifications: z.boolean().describe('Enable notifications'),
          theme: z.enum(['light', 'dark']).describe('UI theme'),
        }),
      }),
      headers: z.object({
        'x-api-key': z.string().min(32).describe('API key for authentication'),
      }),
    }),
    handler: (ctx) => {
      const body = ctx.req.validated.body;
      const headers = ctx.req.validated.headers;
      return ctx.res.json({
        message: 'Complex data processed successfully',
        data: body,
        apiKey: headers['x-api-key'].substring(0, 8) + '...',
      });
    },
  });

  // Product creation with validation
  app.post('/products', {
    requestSchema: zodRequest({
      body: ProductSchema,
    }),
    handler: (ctx) => {
      const body = ctx.req.validated.body;
      const product = {
        id: Math.floor(Math.random() * 1000),
        ...body,
        createdAt: new Date().toISOString(),
      };
      return ctx.res.status(201).json(product);
    },
  });

  // Test validation endpoint
  app.post('/test-validation', {
    requestSchema: zodRequest({
      body: z.object({
        requiredField: z.string().min(1).describe('Required field'),
        numberField: z.number().positive().describe('Positive number'),
      }),
    }),
    handler: (ctx) => {
      const body = ctx.req.validated.body;
      return ctx.res.json({
        message: 'Validation passed!',
        data: body,
        tip: 'All fields were validated successfully',
      });
    },
  });

  // Legacy validation using addRoute
  app.addRoute({
    method: 'POST',
    path: '/legacy-validation',
    requestSchema: zodRequest({
      body: z.object({
        message: z.string().min(1).describe('Message content'),
        priority: z.enum(['low', 'medium', 'high']).describe('Priority level'),
      }),
    }),
    handler: (ctx) => {
      const body = ctx.req.validated.body;
      return ctx.res.json({
        message: 'Legacy validation passed using addRoute!',
        data: body,
        note: 'Both method aliases and addRoute support validation',
      });
    },
  });

  // Error handling for validation
  app.onError((ctx, err) => {
    if (!ctx.res.isSet()) {
      ctx.res.badRequest({
        message: 'Validation or processing error occurred',
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // Initialization hook
  app.onInit(() => {
    app.log.info('Validation example initialized!');
    app.log.info('Available endpoints:');
    app.log.info('   GET  /              - Welcome message');
    app.log.info('   POST /users         - Create user (body validation)');
    app.log.info('   PUT  /users/:id     - Update user (body + params validation)');
    app.log.info('   GET  /users         - List users (query validation)');
    app.log.info('   POST /complex       - Complex validation (body + headers)');
    app.log.info('   POST /products      - Create product (body validation)');
    app.log.info('   POST /test-validation - Test validation');
    app.log.info('   POST /legacy-validation - Legacy addRoute validation');
    app.log.info('');
    app.log.info('Validation example ready!');
  });

  return app;
}

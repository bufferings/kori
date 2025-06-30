import { type Kori, type KoriEnvironment, type KoriRequest, type KoriResponse } from 'kori';
import { zodRequest } from 'kori-zod-schema';
import { z } from 'zod';

export function configure(app: Kori<any, any, any, any, any>) {
  const UserSchema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    age: z.number().int().min(0).max(150),
  });

  const UpdateUserSchema = UserSchema.partial();

  const QuerySchema = z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
    sort: z.enum(['asc', 'desc']).optional(),
  });

  app.post('/users', {
    requestSchema: zodRequest({
      body: UserSchema,
    }),
    handler: (ctx) => {
      const body = ctx.req.validated.body;
      return ctx.res.status(201).json({
        message: 'User created successfully',
        user: body,
      });
    },
  });

  app.put('/users/:id', {
    requestSchema: zodRequest({
      body: UpdateUserSchema,
      params: z.object({
        id: z.string().regex(/^\d+$/),
      }),
    }),
    handler: (ctx) => {
      const body = ctx.req.validated.body;
      const params = ctx.req.validated.params;
      return ctx.res.json({
        message: `User ${params.id} updated successfully`,
        user: body,
      });
    },
  });

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

  app.addRoute({
    method: 'POST',
    path: '/complex',
    requestSchema: zodRequest({
      body: z.object({
        tags: z.array(z.string()),
        metadata: z.record(z.string(), z.any()),
        settings: z.object({
          notifications: z.boolean(),
          theme: z.enum(['light', 'dark']),
        }),
      }),
      headers: z.object({
        'x-api-key': z.string().min(32),
      }),
    }),
    handler: (ctx) => {
      const body = ctx.req.validated.body;
      const headers = ctx.req.validated.headers;
      return ctx.res.json({
        message: 'Complex data processed',
        data: body,
        apiKey: headers['x-api-key'].substring(0, 8) + '...',
      });
    },
  });

  const ProductSchema = z.object({
    name: z.string(),
    price: z.number().positive(),
    inStock: z.boolean(),
  });

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

  // Example of validation error handling using method alias
  app.post('/test-validation', {
    requestSchema: zodRequest({
      body: z.object({
        requiredField: z.string().min(1),
        numberField: z.number().positive(),
      }),
    }),
    handler: (ctx) => {
      const body = ctx.req.validated.body;
      return ctx.res.json({
        message: 'Validation passed!',
        data: body,
      });
    },
  });

  app.addRoute({
    method: 'POST',
    path: '/legacy-validation',
    requestSchema: zodRequest({
      body: z.object({
        message: z.string().min(1),
        priority: z.enum(['low', 'medium', 'high']),
      }),
    }),
    handler: (ctx) => {
      const body = ctx.req.validated.body;
      return ctx.res.json({
        message: 'Legacy validation passed using addRoute!',
        data: body,
        note: 'Both app.post() and app.addRoute() work the same way',
      });
    },
  });

  app.onError((ctx, err) => {
    if (!ctx.res.isSet()) {
      ctx.res.badRequest({
        message: 'Validation or processing error occurred',
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  return app;
}

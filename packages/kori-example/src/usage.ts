import { createKori, defineKoriPlugin, type KoriEnvironment, type KoriRequest, type KoriResponse } from 'kori';
import { bodyLimitPlugin } from 'kori-body-limit-plugin';
import { startNodeServer } from 'kori-nodejs-adapter';
import { scalarUiPlugin } from 'kori-openapi-ui-scalar';
import { createPinoKoriLoggerFactory } from 'kori-pino-adapter';
import { zodOpenApiPlugin, openApiMeta } from 'kori-zod-openapi-plugin';
import { zodRequestSchema } from 'kori-zod-schema';
import { createKoriZodRequestValidator, createKoriZodResponseValidator } from 'kori-zod-validator';
import { z } from 'zod/v4';

const isDev = process.env.NODE_ENV !== 'production';
const loggerFactory = createPinoKoriLoggerFactory({
  level: 'info',
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        ignore: 'pid,hostname',
      },
    },
  }),
});

type RequestIdExtension = { requestId: string };

const requestIdPlugin = <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>() =>
  defineKoriPlugin<Env, Req, Res, unknown, RequestIdExtension, unknown>({
    name: 'requestId',
    apply: (k) =>
      k
        .onRequest((ctx) => {
          const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          return ctx.withReq({ requestId });
        })
        .onResponse((ctx) => {
          ctx.res.setHeader('X-Request-Id', ctx.req.requestId);
        }),
  });

type TimingExtension = { startTime: number };

const timingPlugin = <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>() =>
  defineKoriPlugin<Env, Req, Res, unknown, TimingExtension, unknown>({
    name: 'timing',
    apply: (k) =>
      k
        .onRequest((ctx) => ctx.withReq({ startTime: Date.now() }))
        .onResponse((ctx) => {
          const duration = Date.now() - ctx.req.startTime;
          ctx.res.setHeader('X-Response-Time', `${duration}ms`);
        }),
  });

const ProductSchema = z.object({
  name: z.string().min(1).max(200).meta({ description: 'Product name' }),
  description: z.string().max(1000).optional().meta({ description: 'Product description' }),
  price: z.number().positive().meta({ description: 'Product price' }),
  category: z.enum(['electronics', 'books', 'clothing']).meta({ description: 'Product category' }),
  tags: z.array(z.string()).max(10).meta({ description: 'Product tags' }),
  metadata: z
    .object({
      weight: z.number().positive().optional(),
      dimensions: z
        .object({
          width: z.number().positive(),
          height: z.number().positive(),
          depth: z.number().positive(),
        })
        .optional(),
    })
    .optional(),
});

const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
  responseValidator: createKoriZodResponseValidator(),
  loggerFactory,
})
  .applyPlugin(requestIdPlugin())
  .applyPlugin(timingPlugin())
  .applyPlugin(bodyLimitPlugin())
  .applyPlugin(
    zodOpenApiPlugin({
      info: {
        title: 'Kori Advanced Examples',
        version: '1.0.0',
        description: 'Advanced Kori features: plugins, hooks, complex validation, auth',
      },
      servers: [{ url: 'http://localhost:3001', description: 'Development server' }],
    }),
  )
  .applyPlugin(
    scalarUiPlugin({
      path: '/',
      title: 'Kori Advanced API',
      theme: 'auto',
    }),
  )
  .onRequest((ctx) => {
    ctx.req.log.info('Request started', {
      requestId: ctx.req.requestId,
      method: ctx.req.method,
      path: ctx.req.url.pathname,
    });
  })
  .onResponse((ctx) => {
    ctx.req.log.info('Request completed', {
      requestId: ctx.req.requestId,
      status: ctx.res.getStatus(),
    });
  })
  .onError((ctx, err) => {
    const error = err instanceof Error ? err : new Error(String(err));
    ctx.req.log.error('Request failed', {
      requestId: ctx.req.requestId,
      error: error.message,
    });

    if (!ctx.res.isSet()) {
      ctx.res.internalError({ message: 'Internal server error' });
    }
  });

app.post('/products', {
  pluginMetadata: openApiMeta({
    summary: 'Create product',
    description: 'Create a product with complex validation',
    tags: ['Products'],
  }),
  requestSchema: zodRequestSchema({
    body: ProductSchema,
    headers: z.object({
      'x-api-version': z.enum(['1.0', '2.0']).optional(),
      'x-client-id': z.string().min(1).meta({ description: 'Client identifier' }),
    }),
  }),
  handler: (ctx) => {
    const product = ctx.req.validated.body;
    const headers = ctx.req.validated.headers;

    const newProduct = {
      id: Math.floor(Math.random() * 10000),
      ...product,
      createdAt: new Date().toISOString(),
      clientId: headers['x-client-id'],
      apiVersion: headers['x-api-version'] ?? '1.0',
    };

    ctx.req.log.info('Product created', {
      productId: newProduct.id,
      requestId: ctx.req.requestId,
    });

    return ctx.res.status(201).json(newProduct);
  },
});

app.get('/products/search', {
  pluginMetadata: openApiMeta({
    summary: 'Search products',
    description: 'Advanced product search with filtering',
    tags: ['Products'],
  }),
  requestSchema: zodRequestSchema({
    queries: z.object({
      q: z.string().min(1).meta({ description: 'Search query' }),
      category: z.enum(['electronics', 'books', 'clothing']).optional(),
      minPrice: z
        .string()
        .regex(/^\d+(\.\d{2})?$/)
        .transform(Number)
        .optional(),
      maxPrice: z
        .string()
        .regex(/^\d+(\.\d{2})?$/)
        .transform(Number)
        .optional(),
      tags: z.string().optional().meta({ description: 'Comma-separated tags' }),
      sort: z.enum(['name', 'price', 'created']).default('name'),
      order: z.enum(['asc', 'desc']).default('asc'),
    }),
  }),
  handler: (ctx) => {
    const query = ctx.req.validated.queries;

    // Mock search results
    const results = [
      { id: 1, name: 'Laptop', category: 'electronics', price: 999.99 },
      { id: 2, name: 'TypeScript Book', category: 'books', price: 29.99 },
    ].filter((product) => {
      if (query.category && product.category !== query.category) return false;
      if (query.minPrice && product.price < query.minPrice) return false;
      if (query.maxPrice && product.price > query.maxPrice) return false;
      return product.name.toLowerCase().includes(query.q.toLowerCase());
    });

    return ctx.res.json({
      query: query.q,
      filters: { category: query.category, minPrice: query.minPrice, maxPrice: query.maxPrice },
      results,
      total: results.length,
      requestId: ctx.req.requestId,
    });
  },
});

app.createChild({
  prefix: '/admin',
  configure: (k) =>
    k
      .onRequest((ctx) => {
        const token = ctx.req.headers.authorization?.replace('Bearer ', '');
        if (!token || token !== 'admin-secret-token') {
          ctx.req.log.warn('Unauthorized admin access', { requestId: ctx.req.requestId });
          throw new Error('Unauthorized');
        }
        return ctx.withReq({ isAdmin: true });
      })
      .onError((ctx, err) => {
        const error = err instanceof Error ? err : new Error(String(err));
        if (error.message === 'Unauthorized' && !ctx.res.isSet()) {
          ctx.res.status(401).json({
            error: 'Unauthorized',
            message: 'Admin access required. Use Authorization: Bearer admin-secret-token',
          });
        }
      })
      .get('/dashboard', {
        pluginMetadata: openApiMeta({
          summary: 'Admin dashboard',
          description: 'Get admin dashboard data (requires auth)',
          tags: ['Admin'],
        }),
        handler: (ctx) =>
          ctx.res.json({
            message: 'Admin dashboard',
            stats: {
              totalProducts: 1250,
              totalUsers: 500,
              revenue: 125000.5,
            },
            requestId: ctx.req.requestId,
          }),
      })
      .post('/maintenance', {
        pluginMetadata: openApiMeta({
          summary: 'Toggle maintenance mode',
          description: 'Enable or disable maintenance mode',
          tags: ['Admin'],
        }),
        requestSchema: zodRequestSchema({
          body: z.object({
            mode: z.enum(['enable', 'disable']),
            reason: z.string().optional(),
          }),
        }),
        handler: (ctx) => {
          const { mode, reason } = ctx.req.validated.body;

          ctx.req.log.info('Maintenance mode changed', {
            mode,
            reason,
            requestId: ctx.req.requestId,
          });

          return ctx.res.json({
            message: `Maintenance mode ${mode}d`,
            mode,
            reason,
            timestamp: new Date().toISOString(),
          });
        },
      }),
});

app.get('/health', {
  pluginMetadata: openApiMeta({
    summary: 'Health check',
    description: 'Detailed health information',
    tags: ['System'],
  }),
  handler: (ctx) =>
    ctx.res.json({
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      requestId: ctx.req.requestId,
    }),
});

app.get('/error/:type', {
  pluginMetadata: openApiMeta({
    summary: 'Error demo',
    description: 'Demonstrate different error types',
    tags: ['Demo'],
  }),
  handler: (ctx) => {
    const { type } = ctx.req.pathParams;

    switch (type) {
      case 'validation':
        return ctx.res.badRequest({ message: 'Validation failed' });
      case 'timeout':
        throw new Error('Operation timeout');
      case 'server':
        throw new Error('Internal server error');
      default:
        throw new Error(`Unknown error type: ${type}`);
    }
  },
});

await startNodeServer(app, { port: 3001, host: 'localhost' });

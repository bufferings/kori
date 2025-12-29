/**
 * Kori Advanced Usage Examples
 *
 * This example demonstrates advanced features of Kori:
 * - Custom plugin development
 * - Request/Response hooks and deferred actions
 * - Complex validation scenarios
 * - Authentication and authorization
 * - Multi-media type handling
 * - Streaming responses (SSE, file uploads/downloads)
 * - Lazy logging for performance
 * - Advanced cookie handling
 *
 * Run: pnpm dev:advanced-usage
 * Then open: http://localhost:3001
 */

import {
  createKori,
  defineKoriPlugin,
  HttpRequestHeader,
  HttpResponseHeader,
  HttpStatus,
  type KoriEnvironment,
  type KoriRequest,
  type KoriResponse,
} from '@korix/kori';
import { startNodejsServer } from '@korix/nodejs-server';
import { swaggerUiPlugin } from '@korix/openapi-swagger-ui-plugin';
import { enableStdRequestAndResponseValidation, stdRequestSchema, stdResponseSchema } from '@korix/std-schema-adapter';
import { stdSchemaOpenApiPlugin, openApiMeta } from '@korix/std-schema-openapi-plugin';
import { z } from 'zod';

// ============================================================================
// Custom Plugins
// ============================================================================

type RequestIdExtension = { requestId: string };

const requestIdPlugin = <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>() =>
  defineKoriPlugin<Env, Req, Res, object, RequestIdExtension, object>({
    name: 'requestId',
    apply: (k) =>
      k.onRequest((ctx) => {
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        const ctxWithRequestId = ctx.withReq({ requestId });

        // Defer header setting until after handler execution
        ctxWithRequestId.defer((deferCtx) => {
          deferCtx.res.setHeader('x-request-id', deferCtx.req.requestId);
        });

        return ctxWithRequestId;
      }),
  });

type TimingExtension = { startTime: number };

const timingPlugin = <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>() =>
  defineKoriPlugin<Env, Req, Res, object, TimingExtension, object>({
    name: 'timing',
    apply: (k) =>
      k.onRequest((ctx) => {
        const startTime = Date.now();

        const ctxWithStartTime = ctx.withReq({ startTime });

        // Defer response time header setting until after handler execution
        ctxWithStartTime.defer((deferCtx) => {
          const duration = Date.now() - deferCtx.req.startTime;
          deferCtx.res.setHeader('x-response-time', `${duration}ms`);
        });

        return ctxWithStartTime;
      }),
  });

// ============================================================================
// Schema Definitions
// ============================================================================

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

// Schema for multi-media type examples
const UserJsonSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(0),
});

const UserFormSchema = z.object({
  name: z.string().min(1),
  avatar: z.any(),
});

const UserXmlSchema = z.object({
  user: z.object({
    name: z.string(),
    age: z.number().int(),
  }),
});

// ============================================================================
// Application Setup
// ============================================================================

const app = createKori({
  ...enableStdRequestAndResponseValidation(),
  loggerOptions: {
    level: 'info', // For lazy logging examples
  },
})
  .applyPlugin(requestIdPlugin())
  .applyPlugin(timingPlugin())
  .applyPlugin(
    stdSchemaOpenApiPlugin({
      info: {
        title: 'Kori Advanced Examples',
        version: '1.0.0',
        description: 'Advanced Kori features: plugins, hooks, complex validation, auth, streaming',
      },
      servers: [{ url: 'http://localhost:3001', description: 'Development server' }],
    }),
  )
  .applyPlugin(
    swaggerUiPlugin({
      path: '/',
      title: 'Kori Advanced API',
    }),
  )
  .onRequest((ctx) => {
    // Lazy logging - factory function only executed when logging is enabled
    ctx.log().info('Request started', () => ({
      requestId: ctx.req.requestId,
      method: ctx.req.method(),
      path: ctx.req.url().pathname,
    }));

    // Defer completion logging until after handler execution
    ctx.defer((deferCtx) => {
      deferCtx.log().info('Request completed', () => ({
        requestId: deferCtx.req.requestId,
        status: deferCtx.res.getStatus(),
      }));
    });
  })
  .onError((ctx, err) => {
    const error = err instanceof Error ? err : new Error(String(err));
    ctx.log().error('Request failed', {
      requestId: ctx.req.requestId,
      error: error.message,
    });

    if (!ctx.res.isReady()) {
      ctx.res.internalError({ message: 'Internal server error' });
    }
  });

// ============================================================================
// Complex Validation Routes
// ============================================================================

app.post('/products', {
  pluginMeta: openApiMeta({
    summary: 'Create product',
    description: 'Create a product with complex validation',
    tags: ['Products'],
  }),
  requestSchema: stdRequestSchema({
    body: ProductSchema,
    headers: z.object({
      'x-api-version': z.enum(['1.0', '2.0']).optional(),
      'x-client-id': z.string().min(1).meta({ description: 'Client identifier' }),
    }),
  }),
  responseSchema: stdResponseSchema({
    '201': ProductSchema.extend({
      id: z.number().meta({ description: 'Product ID' }),
      createdAt: z.string().meta({ description: 'Creation timestamp' }),
      clientId: z.string().meta({ description: 'Client identifier' }),
      apiVersion: z.string().meta({ description: 'API version' }),
    }),
  }),
  handler: (ctx) => {
    const product = ctx.req.validatedBody();
    const headers = ctx.req.validatedHeaders();

    const newProduct = {
      id: Math.floor(Math.random() * 10000),
      ...product,
      createdAt: new Date().toISOString(),
      clientId: headers['x-client-id'],
      apiVersion: headers['x-api-version'] ?? '1.0',
    };

    ctx.log().info('Product created', {
      productId: newProduct.id,
      requestId: ctx.req.requestId,
    });

    return ctx.res.status(HttpStatus.CREATED).json(newProduct);
  },
});

app.get('/products/search', {
  pluginMeta: openApiMeta({
    summary: 'Search products',
    description: 'Advanced product search with filtering',
    tags: ['Products'],
  }),
  requestSchema: stdRequestSchema({
    queries: z.object({
      q: z.string().min(1).meta({ description: 'Search query' }),
      category: z.enum(['electronics', 'books', 'clothing']).optional(),
      minPrice: z
        .string()
        .regex(/^\d+(\.\d{2})?$/)
        .optional(),
      maxPrice: z
        .string()
        .regex(/^\d+(\.\d{2})?$/)
        .optional(),
      tags: z.string().optional().meta({ description: 'Comma-separated tags' }),
      sort: z.enum(['name', 'price', 'created']).default('name'),
      order: z.enum(['asc', 'desc']).default('asc'),
    }),
  }),
  responseSchema: stdResponseSchema({
    '200': z.object({
      query: z.string().meta({ description: 'Search query' }),
      filters: z.object({
        category: z.enum(['electronics', 'books', 'clothing']).optional().meta({ description: 'Category filter' }),
        minPrice: z.number().optional().meta({ description: 'Minimum price filter' }),
        maxPrice: z.number().optional().meta({ description: 'Maximum price filter' }),
      }),
      results: z
        .array(
          z.object({
            id: z.number().meta({ description: 'Product ID' }),
            name: z.string().meta({ description: 'Product name' }),
            category: z.string().meta({ description: 'Product category' }),
            price: z.number().meta({ description: 'Product price' }),
          }),
        )
        .meta({ description: 'Search results' }),
      total: z.number().meta({ description: 'Total results count' }),
      requestId: z.string().meta({ description: 'Request ID' }),
    }),
  }),
  handler: (ctx) => {
    const query = ctx.req.validatedQueries();

    // Mock search results
    const results = [
      { id: 1, name: 'Laptop', category: 'electronics', price: 999.99 },
      { id: 2, name: 'TypeScript Book', category: 'books', price: 29.99 },
    ].filter((product) => {
      if (query.category && product.category !== query.category) {
        return false;
      }
      if (query.minPrice && product.price < Number(query.minPrice)) {
        return false;
      }
      if (query.maxPrice && product.price > Number(query.maxPrice)) {
        return false;
      }
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
        const token = ctx.req.header(HttpRequestHeader.AUTHORIZATION)?.replace('Bearer ', '');
        if (!token || token !== 'admin-secret-token') {
          ctx.log().warn('Unauthorized admin access', { requestId: ctx.req.requestId });
          throw new Error('Unauthorized');
        }
        return ctx.withReq({ isAdmin: true });
      })
      .onError((ctx, err) => {
        const error = err instanceof Error ? err : new Error(String(err));
        if (error.message === 'Unauthorized' && !ctx.res.isReady()) {
          ctx.res.unauthorized({
            message: 'Admin access required. Use Authorization: Bearer admin-secret-token',
          });
        }
      })
      .get('/dashboard', {
        pluginMeta: openApiMeta({
          summary: 'Admin dashboard',
          description: 'Get admin dashboard data (requires auth)',
          tags: ['Admin'],
        }),
        responseSchema: stdResponseSchema({
          '200': z.any(),
          '401': z.any(),
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
        pluginMeta: openApiMeta({
          summary: 'Toggle maintenance mode',
          description: 'Enable or disable maintenance mode',
          tags: ['Admin'],
        }),
        requestSchema: stdRequestSchema({
          body: z.object({
            mode: z.enum(['enable', 'disable']),
            reason: z.string().optional(),
          }),
        }),
        responseSchema: stdResponseSchema({
          '200': z.any(),
          '401': z.any(),
        }),
        handler: (ctx) => {
          const { mode, reason } = ctx.req.validatedBody();

          ctx.log().info('Maintenance mode changed', {
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
  pluginMeta: openApiMeta({
    summary: 'Health check',
    description: 'Detailed health information',
    tags: ['System'],
  }),
  responseSchema: stdResponseSchema({
    '200': z.any(),
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
  pluginMeta: openApiMeta({
    summary: 'Error demo',
    description: 'Demonstrate different error types',
    tags: ['Demo'],
  }),
  responseSchema: stdResponseSchema({
    '400': z.any(),
    '500': z.any(),
  }),
  handler: (ctx) => {
    const { type } = ctx.req.params();

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

// Demonstration of new validation error handling
app.post('/validation-demo', {
  pluginMeta: openApiMeta({
    summary: 'Validation demo',
    description: 'Demonstrates new validation error handling features',
    tags: ['Demo'],
  }),
  requestSchema: stdRequestSchema({
    body: z.object({
      age: z.number().int().min(0),
      preferences: z.object({
        newsletter: z.boolean(),
        theme: z.enum(['light', 'dark']),
      }),
    }),
  }),
  responseSchema: stdResponseSchema({
    '200': z.any(),
    '400': z.any(),
  }),
  // Route-level validation error handling
  onRequestValidationFailure: (ctx, reason) => {
    // Log error details for debugging
    ctx.log().warn('Validation demo failed', {
      reason,
      path: ctx.req.url().pathname,
      method: ctx.req.method(),
    });

    // Return minimal error information to client
    return ctx.res.badRequest({
      message: 'Validation demo failed',
    });
  },
  handler: (ctx) => {
    const { age, preferences } = ctx.req.validatedBody();

    return ctx.res.json({
      message: 'Validation successful! New error handling is working.',
      user: { age, preferences },
      timestamp: new Date().toISOString(),
      info: {
        note: 'Try sending invalid JSON or wrong Content-Type to see new error handling in action',
        examples: [
          'Send with Content-Type: text/plain to get 415 Unsupported Media Type',
          'Send invalid JSON to get proper JSON parsing error',
          'Send invalid schema data to get detailed validation errors',
        ],
      },
    });
  },
});

// ============================================================================
// Multi-Media Type Handling
// ============================================================================

// Single media type example
app.post('/users/simple', {
  pluginMeta: openApiMeta({
    summary: 'Create user (simple)',
    description: 'Create user with single media type',
    tags: ['Multi-Media'],
  }),
  requestSchema: stdRequestSchema({ body: UserJsonSchema }),
  responseSchema: stdResponseSchema({
    '201': z.object({
      message: z.string().meta({ description: 'Success message' }),
    }),
  }),
  handler: (ctx) => {
    const user = ctx.req.validatedBody();
    return ctx.res.status(HttpStatus.CREATED).json({
      message: `User created: name=${user.name} age=${user.age}`,
    });
  },
});

// Multiple media types - same provider (Zod)
app.post('/users/multi', {
  pluginMeta: openApiMeta({
    summary: 'Create user (multi-media)',
    description: 'Create user with multiple media type support',
    tags: ['Multi-Media'],
  }),
  requestSchema: stdRequestSchema({
    body: {
      content: {
        'application/json': UserJsonSchema,
        'multipart/form-data': UserFormSchema.meta({
          examples: {
            sample: {
              value: { name: 'Alice', avatar: '<binary>' },
            },
          },
        }),
      },
    },
  }),
  responseSchema: stdResponseSchema({
    '201': z.union([UserJsonSchema, UserFormSchema]),
    '400': z.object({
      message: z.string().meta({ description: 'Error message' }),
    }),
  }),
  handler: (ctx) => {
    const body = ctx.req.validatedBody();
    if (body.mediaType === 'application/json') {
      const v = body.value;
      return ctx.res.status(HttpStatus.CREATED).json(v);
    }
    if (body.mediaType === 'multipart/form-data') {
      const v = body.value;
      return ctx.res.status(HttpStatus.CREATED).json(v);
    }
    return ctx.res.badRequest({ message: 'Unsupported media type' });
  },
});

// Response with multiple media types
app.get('/users/:id/detailed', {
  pluginMeta: openApiMeta({
    summary: 'Get user (multi-response)',
    description: 'Get user with multiple response media types',
    tags: ['Multi-Media'],
  }),
  responseSchema: stdResponseSchema({
    '200': {
      description: 'User detail',
      content: {
        'application/json': UserJsonSchema,
        'application/xml': UserXmlSchema,
      },
    },
    '4XX': {
      description: 'Client error',
      content: { 'application/json': z.object({ message: z.string() }) },
    },
  }),
  handler: (ctx) => {
    const { id } = ctx.req.params();
    return ctx.res.json({ id, name: 'Alice', age: 20 });
  },
});

// ============================================================================
// Streaming Examples
// ============================================================================

// Server-Sent Events (SSE)
app.get('/stream/events', {
  pluginMeta: openApiMeta({
    summary: 'Server-Sent Events',
    description: 'Real-time event stream using SSE',
    tags: ['Streaming'],
  }),
  handler: (ctx) => {
    const transformStream = new TransformStream();
    const writer = transformStream.writable.getWriter();
    const encoder = new TextEncoder();

    // Send periodic updates
    const intervalId = setInterval(() => {
      const message = `data: ${JSON.stringify({
        timestamp: new Date().toISOString(),
        message: 'Hello from server!',
        requestId: ctx.req.requestId,
      })}\n\n`;
      void writer.write(encoder.encode(message));
    }, 1000);

    // Clean up on disconnect
    ctx.req.raw().signal.addEventListener('abort', () => {
      clearInterval(intervalId);
      void writer.close();
    });

    return ctx.res
      .setHeader(HttpResponseHeader.CONTENT_TYPE, 'text/event-stream')
      .setHeader(HttpResponseHeader.CACHE_CONTROL, 'no-cache')
      .setHeader(HttpResponseHeader.CONNECTION, 'keep-alive')
      .stream(transformStream.readable);
  },
});

// File upload streaming
app.post('/stream/upload', {
  pluginMeta: openApiMeta({
    summary: 'Stream file upload',
    description: 'Process file upload stream without loading into memory',
    tags: ['Streaming'],
  }),
  responseSchema: stdResponseSchema({
    '200': z.any(),
    '400': z.any(),
    '500': z.any(),
  }),
  handler: async (ctx) => {
    const bodyStream = (ctx.req as KoriRequest).bodyStream();
    if (!bodyStream) {
      return ctx.res.badRequest({ message: 'No request body' });
    }

    const reader = bodyStream.getReader();
    let totalBytes = 0;
    const chunks: Uint8Array[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        totalBytes += value.length;
        chunks.push(value);

        // Lazy logging for performance
        ctx.log().debug('Received chunk', () => ({
          size: value.length,
          totalBytes,
          requestId: ctx.req.requestId,
        }));
      }

      return ctx.res.json({
        message: 'File uploaded successfully',
        totalBytes,
        chunksReceived: chunks.length,
        requestId: ctx.req.requestId,
      });
    } catch (error) {
      ctx.log().error('Upload error', { error });
      return ctx.res.internalError({ message: 'Upload failed' });
    }
  },
});

// Stream download
app.get('/stream/download', {
  pluginMeta: openApiMeta({
    summary: 'Stream download',
    description: 'Download file as a stream',
    tags: ['Streaming'],
  }),
  handler: (ctx) => {
    const stream = new ReadableStream({
      start(controller) {
        let counter = 0;
        const encoder = new TextEncoder();

        const interval = setInterval(() => {
          if (counter >= 10) {
            controller.close();
            clearInterval(interval);
            return;
          }

          const data = `Chunk ${counter}\n`;
          controller.enqueue(encoder.encode(data));
          counter++;
        }, 500);

        ctx.req.raw().signal.addEventListener('abort', () => {
          clearInterval(interval);
          controller.close();
        });
      },
    });

    return ctx.res
      .setHeader(HttpResponseHeader.CONTENT_TYPE, 'text/plain')
      .setHeader(HttpResponseHeader.CONTENT_DISPOSITION, 'attachment; filename="stream.txt"')
      .stream(stream);
  },
});

// ============================================================================
// Advanced Cookie Handling
// ============================================================================

// Set multiple cookies at once
app.post('/cookies/preferences', {
  pluginMeta: openApiMeta({
    summary: 'Set preferences',
    description: 'Set multiple user preferences in cookies',
    tags: ['Cookies'],
  }),
  requestSchema: stdRequestSchema({
    body: z.object({
      theme: z.enum(['light', 'dark']),
      language: z.string(),
      timezone: z.string(),
    }),
  }),
  responseSchema: stdResponseSchema({
    '200': z.any(),
  }),
  handler: (ctx) => {
    const { theme, language, timezone } = ctx.req.validatedBody();

    ctx.res
      .setCookie('theme', theme, { maxAge: 60 * 60 * 24 * 365 })
      .setCookie('language', language, { maxAge: 60 * 60 * 24 * 365 })
      .setCookie('timezone', timezone, { maxAge: 60 * 60 * 24 * 365 });

    return ctx.res.json({ message: 'Preferences saved', theme, language, timezone });
  },
});

// Secure cookie example
app.post('/cookies/secure-session', {
  pluginMeta: openApiMeta({
    summary: 'Create secure session',
    description: 'Create session with secure cookies',
    tags: ['Cookies'],
  }),
  responseSchema: stdResponseSchema({
    '200': z.any(),
  }),
  handler: (ctx) => {
    // Secure cookie settings for production
    ctx.res.setCookie('secureSession', `secure-${Date.now()}`, {
      httpOnly: true, // Prevent XSS
      secure: true, // HTTPS only (in production)
      sameSite: 'strict', // CSRF protection
      maxAge: 60 * 60, // 1 hour
    });

    return ctx.res.json({ message: 'Secure session created' });
  },
});

// Conditional cookie setting
app.get('/cookies/visit', {
  pluginMeta: openApiMeta({
    summary: 'Track visits',
    description: 'Track and increment visit count',
    tags: ['Cookies'],
  }),
  responseSchema: stdResponseSchema({
    '200': z.any(),
  }),
  handler: (ctx) => {
    const visitCount = ctx.req.cookie('visitCount');
    const newCount = visitCount ? parseInt(visitCount, 10) + 1 : 1;

    ctx.res.setCookie('visitCount', newCount.toString(), {
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    if (newCount === 1) {
      ctx.res.setCookie('firstVisit', new Date().toISOString(), {
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
    }

    return ctx.res.json({
      message: `This is your visit #${newCount}`,
      isFirstVisit: newCount === 1,
      requestId: ctx.req.requestId,
    });
  },
});

// ============================================================================
// Lazy Logging Performance Example
// ============================================================================

app.get('/performance/lazy-logging', {
  pluginMeta: openApiMeta({
    summary: 'Lazy logging demo',
    description: 'Demonstrates lazy logging for performance optimization',
    tags: ['Performance'],
  }),
  responseSchema: stdResponseSchema({
    '200': z.any(),
  }),
  handler: (ctx) => {
    const startTime = Date.now();

    // This expensive computation will NOT run because debug level is disabled
    ctx.log().debug('Processing request (lazy)', () => {
      // Expensive operations here
      return {
        path: ctx.req.url().pathname,
        headers: ctx.req.headers(), // Expensive serialization
        timestamp: Date.now(),
        processingTime: Date.now() - startTime,
      };
    });

    // This will execute because info level is enabled
    ctx.log().info('Request processed', () => ({
      path: ctx.req.url().pathname,
      duration: Date.now() - startTime,
      requestId: ctx.req.requestId,
    }));

    return ctx.res.json({
      message: 'Lazy logging optimizes performance by avoiding unnecessary computations',
      info: 'Debug log with expensive operations was skipped',
    });
  },
});

await startNodejsServer(app, { port: 3001, hostname: 'localhost' });

import { createKori } from 'kori';
import { startNodeServer } from 'kori-nodejs-adapter';
import { scalarUIPlugin } from 'kori-openapi-ui-scalar';
import { zodOpenApiPlugin } from 'kori-zod-openapi-plugin';
import { zodRequest } from 'kori-zod-schema';
import { createKoriZodRequestValidator, createKoriZodResponseValidator } from 'kori-zod-validator';
import { z } from 'zod';

// Import individual example configurations
import { configure as configureGettingStarted } from './01-getting-started.js';
import { configure as configureBasicRouting } from './02-basic-routing.js';

const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
  responseValidator: createKoriZodResponseValidator(),
})
  .applyPlugin(
    zodOpenApiPlugin({
      info: {
        title: 'Kori Framework Examples',
        version: '1.0.0',
        description: 'Comprehensive examples demonstrating Kori framework capabilities',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
      ],
    }),
  )
  .applyPlugin(
    scalarUIPlugin({
      title: 'Kori Framework Examples - API Documentation',
      theme: 'auto',
    }),
  );

app.get('/', (ctx) => {
  return ctx.res.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kori Framework Examples</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.6;
          }
          h1 { color: #333; }
          h2 { color: #555; margin-top: 2rem; }
          .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; }
          .card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 1rem;
            background: #f9f9f9;
          }
          .card h3 { margin-top: 0; color: #0066cc; }
          a {
            color: #0066cc;
            text-decoration: none;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            transition: background 0.2s;
          }
          a:hover { background: #e6f3ff; }
          .docs-link {
            display: inline-block;
            background: #0066cc;
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            font-weight: bold;
            margin: 1rem 0;
          }
          .docs-link:hover { background: #0052a3; color: white; }
        </style>
      </head>
      <body>
        <h1>Kori Framework Examples</h1>
        <p>Welcome to the comprehensive Kori framework examples. This server demonstrates all major features and capabilities.</p>
        
        <a href="/docs" class="docs-link">View API Documentation (Scalar UI)</a>
        
        <div class="grid">
          <div class="card">
            <h3>01 - Getting Started</h3>
            <p>Basic Kori framework usage, routing, and request validation</p>
            <a href="/01-getting-started">GET /01-getting-started</a><br>
            <a href="/01-getting-started/hello/World">GET /01-getting-started/hello/:name</a><br>
            <a href="/01-getting-started/search?q=kori">GET /01-getting-started/search</a><br>
            <a href="/01-getting-started/about">GET /01-getting-started/about</a>
          </div>
          
          <div class="card">
            <h3>02 - Basic Routing</h3>
            <p>HTTP methods, path parameters, query strings, different response types</p>
            <a href="/02-basic-routing">GET /02-basic-routing</a><br>
            <a href="/02-basic-routing/hello/World">GET /02-basic-routing/hello/:name</a><br>
            <a href="/02-basic-routing/users">GET /02-basic-routing/users</a><br>
            <a href="/02-basic-routing/query?name=Alice&age=25">GET /02-basic-routing/query</a><br>
            <a href="/02-basic-routing/text">GET /02-basic-routing/text</a>
          </div>
          
          <div class="card">
            <h3>Validation</h3>
            <p>Request validation with Zod schemas</p>
            <a href="/validation/users?page=1&limit=5">GET /validation/users</a><br>
            <p>POST /validation/users (with body validation)</p>
          </div>
          
          <div class="card">
            <h3>Lifecycle Hooks</h3>
            <p>Request lifecycle management and hooks</p>
            <a href="/lifecycle/health">GET /lifecycle/health</a><br>
            <a href="/lifecycle/slow">GET /lifecycle/slow</a><br>
            <a href="/lifecycle/data/123">GET /lifecycle/data/:id</a>
          </div>
          
          <div class="card">
            <h3>Plugin System</h3>
            <p>Timing, CORS, rate limiting, authentication plugins</p>
            <a href="/plugins/public">GET /plugins/public</a><br>
            <a href="/plugins/protected">GET /plugins/protected</a><br>
            <a href="/plugins/rate-limit-test">GET /plugins/rate-limit-test</a>
          </div>
          
          <div class="card">
            <h3>Child Instances</h3>
            <p>API versioning and nested routing</p>
            <a href="/api/v1/users">GET /api/v1/users</a><br>
            <a href="/api/v2/users">GET /api/v2/users</a><br>
            <a href="/admin/stats">GET /admin/stats</a>
          </div>
          
          <div class="card">
            <h3>Error Handling</h3>
            <p>Custom error types and error handling strategies</p>
            <a href="/errors/basic">GET /errors/basic</a><br>
            <a href="/errors/custom">GET /errors/custom</a><br>
            <a href="/errors/validation">GET /errors/validation</a>
          </div>
        </div>
      </body>
      </html>
    `);
});

// Mount individual examples using configure functions
app.createChild({
  prefix: '/01-getting-started',
  configure: configureGettingStarted,
});

app.createChild({
  prefix: '/02-basic-routing',
  configure: configureBasicRouting,
});

const basicRoutes = app.createChild({
  prefix: '/basic',
  configure: (kori) => kori,
});

basicRoutes.get('/hello/:name', (ctx) => {
  const name = ctx.req.pathParams.name;
  return ctx.res.json({ message: `Hello, ${name}!` });
});

basicRoutes.get('/users', (ctx) => {
  const users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie' },
  ];
  return ctx.res.json(users);
});

basicRoutes.get('/text', (ctx) => ctx.res.text('This is a plain text response'));

basicRoutes.get('/html', (ctx) => ctx.res.html('<h1>Hello from Kori!</h1>'));

const UserSchema = z.object({
  name: z.string().min(1).max(100).describe('User full name'),
  email: z.string().email().describe('User email address'),
  age: z.number().int().min(0).max(150).describe('User age'),
});

const QuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1').describe('Page number'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10').describe('Items per page'),
  sort: z.enum(['asc', 'desc']).optional().describe('Sort order'),
});

const validationRoutes = app.createChild({
  prefix: '/validation',
  configure: (kori) => kori,
});

validationRoutes.post('/users', {
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

validationRoutes.get('/users', {
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

let requestCount = 0;
const activeRequests = new Map<string, number>();

const lifecycleRoutes = app
  .createChild({
    prefix: '/lifecycle',
    configure: (kori) => kori,
  })
  .onRequest((ctx) => {
    requestCount++;
    const requestId = `req-${requestCount}`;
    const startTime = Date.now();
    activeRequests.set(requestId, startTime);

    ctx.req.log.info('Lifecycle request started', {
      requestId,
      method: ctx.req.method,
      url: ctx.req.url.href,
    });

    return ctx.withReq({ requestId, startTime });
  })
  .onResponse((ctx) => {
    const requestId = ctx.req.requestId;
    const startTime = ctx.req.startTime;
    const duration = Date.now() - startTime;
    activeRequests.delete(requestId);

    ctx.req.log.info('Lifecycle request completed', {
      requestId,
      duration,
      status: ctx.res.getStatus(),
    });
  });

lifecycleRoutes.get('/health', (ctx) =>
  ctx.res.json({
    status: 'healthy',
    requestCount,
    activeRequests: activeRequests.size,
    uptime: process.uptime(),
    requestId: ctx.req.requestId,
  }),
);

lifecycleRoutes.get('/slow', async (ctx) => {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return ctx.res.json({
    message: 'This was a slow request',
    requestId: ctx.req.requestId,
  });
});

lifecycleRoutes.get('/data/:id', (ctx) => {
  const id = ctx.req.pathParams.id;

  if (id === '0') {
    throw new Error('Invalid ID: 0');
  }

  return ctx.res.json({
    id,
    data: `Data for ID ${id}`,
    requestId: ctx.req.requestId,
  });
});

const store = new Map<string, { count: number; resetTime: number }>();

const pluginRoutes = app.createChild({
  prefix: '/plugins',
  configure: (kori) => kori,
});

pluginRoutes.get('/public', (ctx) => {
  const start = Date.now();

  const clientIp = ctx.req.headers['x-forwarded-for'] ?? 'localhost';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const max = 100;

  let clientData = store.get(clientIp);

  if (!clientData || now > clientData.resetTime) {
    clientData = { count: 0, resetTime: now + windowMs };
    store.set(clientIp, clientData);
  }

  clientData.count++;

  const rateLimit = {
    limit: max,
    remaining: Math.max(0, max - clientData.count),
    reset: clientData.resetTime,
  };

  ctx.res.setHeader('X-RateLimit-Limit', rateLimit.limit.toString());
  ctx.res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  ctx.res.setHeader('X-RateLimit-Reset', rateLimit.reset.toString());
  ctx.res.setHeader('X-Response-Time', `${Date.now() - start}ms`);

  return ctx.res.json({
    message: 'This is a public endpoint',
    rateLimit,
  });
});

pluginRoutes.get('/protected', (ctx) => {
  const authHeader = ctx.req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  const authenticated = !!token && token.length > 0;
  const user = authenticated ? { id: 'demo-user', role: 'admin' } : undefined;

  if (!authenticated || !user) {
    return ctx.res.status(401).json({ message: 'Authentication required' });
  }

  return ctx.res.json({
    message: 'This is a protected endpoint',
    user,
  });
});

pluginRoutes.get('/rate-limit-test', (ctx) => {
  const clientIp = ctx.req.headers['x-forwarded-for'] ?? 'localhost';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const max = 100;

  let clientData = store.get(clientIp);

  if (!clientData || now > clientData.resetTime) {
    clientData = { count: 0, resetTime: now + windowMs };
    store.set(clientIp, clientData);
  }

  clientData.count++;

  const rateLimit = {
    limit: max,
    remaining: Math.max(0, max - clientData.count),
    reset: clientData.resetTime,
  };

  ctx.res.setHeader('X-RateLimit-Limit', rateLimit.limit.toString());
  ctx.res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  ctx.res.setHeader('X-RateLimit-Reset', rateLimit.reset.toString());

  return ctx.res.json({
    message: 'Rate limit test',
    rateLimit,
  });
});

const v1Routes = app.createChild({
  prefix: '/api/v1',
  configure: (kori) => kori,
});

v1Routes.get('/users', (ctx) =>
  ctx.res.json({
    apiVersion: 'v1',
    users: [
      { id: 1, name: 'Alice', version: 'v1' },
      { id: 2, name: 'Bob', version: 'v1' },
    ],
  }),
);

const v2Routes = app.createChild({
  prefix: '/api/v2',
  configure: (kori) => kori,
});

v2Routes.get('/users', (ctx) =>
  ctx.res.json({
    apiVersion: 'v2',
    features: ['pagination', 'filtering', 'sorting'],
    users: [
      {
        id: 1,
        name: 'Alice',
        email: 'alice@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        version: 'v2',
      },
      {
        id: 2,
        name: 'Bob',
        email: 'bob@example.com',
        createdAt: '2024-01-02T00:00:00Z',
        version: 'v2',
      },
    ],
  }),
);

const adminRoutes = app.createChild({
  prefix: '/admin',
  configure: (kori) => kori,
});

adminRoutes.get('/stats', (ctx) => {
  const authHeader = ctx.req.headers['x-admin-token'];

  if (!authHeader || authHeader.length === 0) {
    return ctx.res.status(401).json({ message: 'Admin access required' });
  }

  return ctx.res.json({
    isAdmin: true,
    stats: {
      totalUsers: 100,
      totalPosts: 500,
      activeUsers: 85,
    },
  });
});

class CustomError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'CustomError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

const errorRoutes = app.createChild({
  prefix: '/errors',
  configure: (kori) => kori,
});

errorRoutes.get('/basic', () => {
  throw new Error('This is a basic error');
});

errorRoutes.get('/custom', () => {
  throw new CustomError('Custom error occurred', 418, 'TEAPOT');
});

errorRoutes.get('/validation', (ctx) => {
  return ctx.res.badRequest({
    message: 'Validation failed',
    details: {
      fields: {
        email: 'Invalid email format',
        age: 'Must be a positive number',
      },
    },
  });
});

app.onError((ctx, err) => {
  const error = err instanceof Error ? err : new Error(String(err));

  ctx.req.log.error('Error occurred', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    request: {
      method: ctx.req.method,
      path: ctx.req.url.pathname,
    },
  });

  if (!ctx.res.isSet()) {
    if (err instanceof CustomError) {
      ctx.res.status(err.statusCode).json({
        error: {
          code: err.code,
          message: err.message,
        },
      });
    } else {
      ctx.res.internalError({
        message: 'An unexpected error occurred',
      });
    }
  }
});

app.onInit(() => {
  app.log.info('Kori comprehensive example server starting...');
  app.log.info('Main page available at: http://localhost:3000');
  app.log.info('');
  app.log.info('Available example categories:');
  app.log.info('  * Basic routing: /basic/*');
  app.log.info('  * Validation: /validation/*');
  app.log.info('  * Lifecycle hooks: /lifecycle/*');
  app.log.info('  * Plugin system: /plugins/*');
  app.log.info('  * Child instances: /api/v1/*, /api/v2/*, /admin/*');
  app.log.info('  * Error handling: /errors/*');
});

await startNodeServer(app, { port: 3000, host: 'localhost' });
app.log.info('Kori comprehensive example server started on http://localhost:3000');

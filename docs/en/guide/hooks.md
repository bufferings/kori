# Hooks

Hooks provide powerful interception points in Kori's request lifecycle, enabling **cross-cutting concerns** like authentication, logging, caching, and error handling.

## Hook Types

Kori provides two categories of hooks:

### Lifecycle Hooks

Execute once during application startup/shutdown:

- **`onInit`** - Application initialization (database setup, config loading)
- **`onClose`** - Application shutdown (cleanup, graceful shutdown)

### Handler Hooks

Execute for every matching request:

- **`onRequest`** - Before request handler (auth, logging, validation)
- **`onResponse`** - After successful request handler (response modification)
- **`onError`** - When an error occurs (error handling, reporting)
- **`onFinally`** - Always executes (cleanup, metrics)

## Lifecycle Hooks

### Application Initialization

Set up shared resources when the application starts:

```typescript
app.onInit(async (ctx) => {
  console.log('Application starting...');

  // Initialize database
  const db = await connectDatabase(process.env.DATABASE_URL);

  // Initialize cache
  const redis = await connectRedis(process.env.REDIS_URL);

  // Load configuration
  const config = await loadConfiguration();

  // Return extended environment
  return ctx.withEnv({
    db,
    redis,
    config,
    startTime: Date.now(),
  });
});
```

### Application Shutdown

Clean up resources when the application shuts down:

```typescript
app.onClose(async (ctx) => {
  console.log('Application shutting down...');

  // Close database connections
  await ctx.env.db.close();

  // Close Redis connection
  await ctx.env.redis.quit();

  // Clean up temporary files
  await cleanupTempFiles();

  console.log('Shutdown complete');
});
```

## Handler Hooks

### Request Processing

Execute code before each request handler:

```typescript
const appWithRequestId = app.onRequest((ctx) => {
  // Add request ID for tracking
  const requestId = crypto.randomUUID();

  // Log request start
  ctx.req.log().info('Request started', {
    requestId,
    method: ctx.req.method(),
    path: ctx.req.url().pathname,
  });

  // Add to request context
  return ctx.withReq({ requestId });
});
```

### Authentication

Implement authentication middleware:

```typescript
const appWithAuth = app.onRequest(async (ctx) => {
  const token = ctx.req.header('authorization');

  if (!token) {
    return ctx.res.unauthorized({ message: 'Token required' });
  }

  try {
    const user = await validateToken(token.replace('Bearer ', ''));
    return ctx.withReq({ user });
  } catch (error) {
    return ctx.res.unauthorized({ message: 'Invalid token' });
  }
});
```

### Response Processing

Modify responses after successful handlers:

```typescript
app.onResponse((ctx) => {
  // Add response headers
  ctx.res.setHeader('X-Request-Id', ctx.req.requestId);
  ctx.res.setHeader('X-Response-Time', Date.now() - ctx.req.startTime);

  // Log response
  ctx.req.log().info('Request completed', {
    requestId: ctx.req.requestId,
    status: ctx.res.getStatus(),
    responseTime: Date.now() - ctx.req.startTime,
  });
});
```

### Error Handling

Handle errors that occur during request processing:

```typescript
app.onError((ctx, error) => {
  // Log error with context
  ctx.req.log().error('Request failed', {
    requestId: ctx.req.requestId,
    error: error.message,
    stack: error.stack,
    path: ctx.req.url().pathname,
  });

  // Send error response if not already sent
  if (!ctx.res.isReady()) {
    if (error.name === 'ValidationError') {
      return ctx.res.badRequest({ message: error.message });
    }

    return ctx.res.internalError({ message: 'Internal Server Error' });
  }
});
```

### Cleanup

Execute code that always runs (success or error):

```typescript
app.onFinally((ctx) => {
  // Update metrics
  ctx.env.metrics?.increment('requests.total', {
    method: ctx.req.method(),
    status: ctx.res.getStatus().toString(),
  });

  // Clean up request-specific resources
  if (ctx.req.tempFiles) {
    cleanupTempFiles(ctx.req.tempFiles);
  }

  // Log final status
  const duration = Date.now() - ctx.req.startTime;
  ctx.req.log().info('Request finished', {
    requestId: ctx.req.requestId,
    duration,
    status: ctx.res.getStatus(),
  });
});
```

## Common Patterns

### CORS Handling

Simple CORS implementation:

```typescript
const appWithCors = app.onRequest((ctx) => {
  const origin = ctx.req.header('origin');
  const allowedOrigins = ['https://myapp.com', 'https://admin.myapp.com'];

  if (allowedOrigins.includes(origin)) {
    ctx.res.setHeader('access-control-allow-origin', origin);
    ctx.res.setHeader('access-control-allow-credentials', 'true');
  }

  if (ctx.req.method() === 'OPTIONS') {
    ctx.res.setHeader('access-control-allow-methods', 'GET, POST, PUT, DELETE');
    ctx.res.setHeader('access-control-allow-headers', 'content-type, authorization');
    return ctx.res.status(204).text('');
  }

  return ctx;
});
```

### Rate Limiting

Basic rate limiting implementation:

```typescript
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const appWithRateLimit = app.onRequest((ctx) => {
  const clientId = ctx.req.header('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const window = 60 * 1000; // 1 minute window
  const limit = 100; // 100 requests per minute

  let entry = rateLimitStore.get(clientId);

  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + window };
    rateLimitStore.set(clientId, entry);
  }

  entry.count++;

  if (entry.count > limit) {
    return ctx.res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded',
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    });
  }

  return ctx;
});
```

### Request Caching

Simple response caching:

```typescript
const cache = new Map<string, { data: any; expires: number }>();

const appWithCache = app.onRequest((ctx) => {
  if (ctx.req.method() !== 'GET') return ctx;

  const cacheKey = ctx.req.url().href;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() < cached.expires) {
    return ctx.res.json(cached.data);
  }

  return ctx;
});

app.onResponse((ctx) => {
  if (ctx.req.method() === 'GET' && ctx.res.getStatus() === 200) {
    const cacheKey = ctx.req.url().href;
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Note: This is a simplified example
    // Real implementation would need to serialize response
    cache.set(cacheKey, { data: ctx.res.body, expires });
  }
});
```

### Security Headers

Add security headers to all responses:

```typescript
app.onResponse((ctx) => {
  ctx.res.setHeader('x-content-type-options', 'nosniff');
  ctx.res.setHeader('x-frame-options', 'DENY');
  ctx.res.setHeader('x-xss-protection', '1; mode=block');
  ctx.res.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
  ctx.res.setHeader('content-security-policy', "default-src 'self'");
});
```

### Database Transaction

Manage database transactions per request:

```typescript
const appWithTransaction = app.onRequest(async (ctx) => {
  const transaction = await ctx.env.db.transaction();
  return ctx.withReq({ transaction });
});

app.onResponse(async (ctx) => {
  if (ctx.req.transaction) {
    await ctx.req.transaction.commit();
  }
});

app.onError(async (ctx, error) => {
  if (ctx.req.transaction) {
    await ctx.req.transaction.rollback();
  }

  if (!ctx.res.isReady()) {
    ctx.res.internalError({ message: 'Database error occurred' });
  }
});
```

## Hook Order and Execution

Hooks execute in the order they are registered:

```typescript
// Execution order for a successful request:
// 1. onInit (once at startup)
// 2. onRequest (all registered onRequest hooks)
// 3. Route handler
// 4. onResponse (all registered onResponse hooks)
// 5. onFinally (all registered onFinally hooks)

// Execution order for a failed request:
// 1. onInit (once at startup)
// 2. onRequest (until error or completion)
// 3. Route handler (if no error in onRequest)
// 4. onError (if error occurred)
// 5. onFinally (always executes)

// Register hooks individually to maintain type safety
const appWithHook1 = app.onRequest((ctx) => {
  console.log('Request hook 1');
  return ctx;
});

const appWithHook2 = appWithHook1.onRequest((ctx) => {
  console.log('Request hook 2');
  return ctx;
});

app.onResponse((ctx) => {
  console.log('Response hook 1');
});

app.onResponse((ctx) => {
  console.log('Response hook 2');
});
```

## Next Steps

- **[Plugin Development](/en/guide/plugins)** - Create reusable hooks as plugins
- **[Error Handling](/en/guide/error-handling)** - Advanced error handling patterns
- **[Examples](/en/examples/)** - See hooks in action with real applications
- **[Core API Reference](/en/core/kori)** - Complete hooks API documentation

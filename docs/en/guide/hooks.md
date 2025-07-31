# Hooks

Hooks provide interception points in Kori's application and request lifecycle for authentication, logging, caching, and error handling.

## Hook Types

Kori provides two categories of hooks:

### Lifecycle Hooks

Execute once during application startup/shutdown:

- `onInit` - Application initialization (database setup, config loading)
- `onClose` - Application shutdown (cleanup, graceful shutdown)

### Handler Hooks

Execute for every matching request:

- `onRequest` - Before request handler (auth, logging, validation)
- `onResponse` - After successful request handler (response modification)
- `onError` - When an error occurs (error handling, reporting)
- `onFinally` - Always executes (cleanup, metrics)

## Lifecycle Hooks

### onInit Hook

Set up shared resources when the application starts:

```typescript
const app = createKori().onInit(async (ctx) => {
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

### onClose Hook

Clean up resources when the application shuts down:

```typescript
const app = createKori()
  .onInit(async (ctx) => {
    // ... initialization code
  })
  .onClose(async (ctx) => {
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

### onRequest Hook

Execute code before each request handler:

```typescript
const app = createKori().onRequest((ctx) => {
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

app.get('/users', (ctx) => {
  // Request ID is available in all route handlers
  const { requestId } = ctx.req;
  return ctx.res.json({ message: 'Hello', requestId });
});
```

### onResponse Hook

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

### onError Hook

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

  if (error.name === 'ValidationError') {
    ctx.res.badRequest({ message: error.message });
  } else {
    ctx.res.internalError({ message: 'Internal Server Error' });
  }
});
```

### onFinally Hook

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

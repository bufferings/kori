# Hooks

Hooks provide interception points in Kori's application and request lifecycle for authentication, logging, caching, and error handling.

## Hook Types

Kori provides two categories of hooks:

### Lifecycle Hooks

Execute once during application startup:

- `onStart` - Application initialization (database setup, config loading, defer cleanup)

### Handler Hooks

Execute for every matching request:

- `onRequest` - Before request handler (auth, logging, validation, defer cleanup)
- `onError` - When an error occurs (error handling, reporting)

## Lifecycle Hooks

### onStart Hook

Set up shared resources when the application starts:

```typescript
const app = createKori().onStart(async (ctx) => {
  console.log('Application starting...');

  // Initialize database
  const db = await connectDatabase(process.env.DATABASE_URL);

  // Initialize cache
  const redis = await connectRedis(process.env.REDIS_URL);

  // Load configuration
  const config = await loadConfiguration();

  // Defer cleanup operations for shutdown
  ctx.defer(async (ctx) => {
    console.log('Application shutting down...');

    // Close database connections
    await ctx.env.db.close();

    // Close Redis connection
    await ctx.env.redis.quit();

    // Clean up temporary files
    await cleanupTempFiles();

    console.log('Shutdown complete');
  });

  // Return extended environment
  return ctx.withEnv({
    db,
    redis,
    config,
    startTime: Date.now(),
  });
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

### Defer Pattern for Cleanup

Use `ctx.defer()` within hooks to register cleanup operations that execute after the handler:

```typescript
app.onRequest((ctx) => {
  // Set up resources
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Defer cleanup and logging
  ctx.defer((ctx) => {
    // Update metrics
    ctx.env.metrics?.increment('requests.total', {
      method: ctx.req.method(),
      status: ctx.res.getStatus().toString(),
    });

    // Log final status
    const duration = Date.now() - startTime;
    ctx.req.log().info('Request finished', {
      requestId,
      duration,
      status: ctx.res.getStatus(),
    });
  });

  return ctx.withReq({ requestId, startTime });
});
```

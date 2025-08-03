# Hooks

Hooks provide interception points in Kori's application and request lifecycle for authentication, logging, caching, and error handling.

## Hook Types

Kori provides two categories of hooks:

### Lifecycle Hooks

Execute once during application lifecycle:

- `onStart` - Application initialization and shutdown cleanup (database setup, config loading, defer cleanup)

### Handler Hooks

Execute for every matching request:

- `onRequest` - Pre-request processing and post-request cleanup (auth, logging, validation, defer cleanup)
- `onError` - Error handling and response generation (error handling, logging, response generation)

## onStart Hook

```typescript
const app = createKori().onStart(async (ctx) => {
  ctx.log().info('Application starting...');

  // Initialize database
  const db = await connectDatabase(process.env.DATABASE_URL);

  // Initialize cache
  const redis = await connectRedis(process.env.REDIS_URL);

  // Load configuration
  const config = await loadConfiguration();

  // Defer cleanup operations for shutdown
  ctx.defer(async () => {
    ctx.log().info('Application shutting down...');

    // Close database connections (use closure variables)
    await db.close();

    // Close Redis connection (use closure variables)
    await redis.quit();

    // Clean up temporary files
    await cleanupTempFiles();

    ctx.log().info('Shutdown complete');
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

## onRequest Hook

```typescript
const app = createKori().onRequest((ctx) => {
  // Add request ID for tracking
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // Log request start
  ctx.log().info('Request started', {
    requestId,
    method: ctx.req.method(),
    path: ctx.req.url().pathname,
  });

  // Defer response logging and cleanup
  ctx.defer(() => {
    const duration = Date.now() - startTime;

    // Log request completion
    ctx.log().info('Request completed', {
      requestId,
      duration,
      status: ctx.res.getStatus(),
      method: ctx.req.method(),
      path: ctx.req.url().pathname,
    });

    // Update metrics, cleanup resources, etc.
    // metrics.recordRequestDuration(duration);
  });

  // Add to request context
  return ctx.withReq({ requestId, startTime });
});

app.get('/users', (ctx) => {
  // Request ID is available in all route handlers
  const { requestId } = ctx.req;
  return ctx.res.json({ message: 'Hello', requestId });
});
```

## onError Hook

Handle errors that occur during request processing:

```typescript
app.onError((ctx, error) => {
  ctx.log().error('Request error', {
    method: ctx.req.method(),
    path: ctx.req.url().pathname,
    error: error instanceof Error ? error.message : String(error),
  });

  if (error instanceof Error) {
    return ctx.res.internalError({ message: error.message });
  }
  return ctx.res.internalError({ message: 'An error occurred' });
});
```

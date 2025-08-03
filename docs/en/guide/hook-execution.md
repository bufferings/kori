# Hook Execution

Understanding how hooks execute will help you build applications with predictable behavior.

## Instance Hooks

Instance hooks execute once during application lifecycle.

### Execution Order

`onStart` (app startup) → ... → `defer` callbacks (app shutdown)

Instance hooks execute in registration order, defer callbacks execute in reverse order:

```typescript
const app = createKori()
  .onStart(async (ctx) => {
    console.log('Start 1: Database setup');

    // Defer cleanup for this resource
    ctx.defer(() => {
      console.log('Defer 1: Database cleanup');
    });

    return ctx.withEnv({ db: 'connected' });
  })
  .onStart(async (ctx) => {
    console.log('Start 2: Cache setup');

    // Defer cleanup for this resource
    ctx.defer(() => {
      console.log('Defer 2: Cache cleanup');
    });

    return ctx.withEnv({ cache: 'connected' });
  });

// Output during startup:
// Start 1: Database setup
// Start 2: Cache setup

// Output during shutdown (LIFO order):
// Defer 2: Cache cleanup
// Defer 1: Database cleanup
```

## Request Hooks

Request hooks execute for every matching request.

Key behaviors:

- `defer` callbacks execute in **reverse order** (LIFO)
- `onRequest` can stop processing by returning a response
- Hooks are captured when you define routes, not when requests arrive

### Execution Order

`onRequest` → Route Handler → `defer` callbacks (reverse order)

```typescript
const app = createKori()
  .onRequest((ctx) => {
    console.log('Request 1: Auth check');

    // Defer cleanup operations
    ctx.defer(() => {
      console.log('Defer 1: Auth cleanup');
    });

    return ctx.withReq({ authenticated: true });
  })
  .onRequest((ctx) => {
    console.log('Request 2: Logging');

    // Defer metrics collection
    ctx.defer(() => {
      console.log('Defer 2: Metrics');
    });

    return ctx.withReq({ requestId: 'abc123' });
  });

app.get('/example', (ctx) => {
  console.log('Handler: Processing request');

  // Defer response logging
  ctx.defer(() => {
    console.log('Defer 3: Response logged');
  });

  return ctx.res.json({ message: 'Hello' });
});

// Output:
// Request 1: Auth check
// Request 2: Logging
// Handler: Processing request
// Defer 3: Response logged      ← Reverse order (LIFO)!
// Defer 2: Metrics              ← Reverse order (LIFO)!
// Defer 1: Auth cleanup         ← Reverse order (LIFO)!
```

### Early Response in onRequest

`onRequest` hooks can stop the execution flow by returning a response. When a hook returns a response, the remaining hooks and route handler are skipped.

Use this pattern for authentication, rate limiting, or validation:

```typescript
const app = createKori().onRequest((ctx) => {
  const token = ctx.req.header('authorization');
  if (!token) {
    // Stops here - handler won't run
    return ctx.res.unauthorized({ message: 'Token required' });
  }
  return ctx.withReq({ authenticated: true });
});

app.get('/protected', (ctx) => {
  // Only runs if token exists
  return ctx.res.json({ message: 'Protected resource' });
});
```

### onError Execution

When an error occurs, `onError` hooks replace the normal execution flow:

**Normal flow**: `onRequest` → Route Handler → `defer` callbacks
**Error flow**: `onRequest` → Error occurs → `onError` hooks → `defer` callbacks

```typescript
const app = createKori()
  .onRequest((ctx) => {
    console.log('Request: Starting');

    ctx.defer(() => {
      console.log('Defer: Always runs, even on error');
    });

    return ctx.withReq({ authenticated: true });
  })
  .onError((ctx, error) => {
    console.log('Error: Handling error');
    return ctx.res.internalError({ message: 'Something went wrong' });
  });

app.get('/error-demo', (ctx) => {
  console.log('Handler: This will throw');
  throw new Error('Demo error');
});

// Output when error occurs:
// Request: Starting
// Handler: This will throw
// Error: Handling error
// Defer: Always runs, even on error
```

#### Multiple onError Hooks

When multiple `onError` hooks are registered, they execute in order until one returns a response:

```typescript
const app = createKori()
  .onError((ctx, error) => {
    // Log error but don't handle it (continue to next hook)
    console.log('Error logger:', error.message);
  })
  .onError((ctx, error) => {
    // Handle specific error types
    if (error instanceof ValidationError) {
      return ctx.res.badRequest({ message: error.message });
    }
    // Continue to next hook if not handled
  })
  .onError((ctx, error) => {
    // Final fallback
    return ctx.res.internalError({ message: 'Internal error' });
  });
```

### Common Gotcha: Hook Timing

Important: Hooks are captured when you define routes, not when requests arrive.

```typescript
const app = createKori();

// Define route first
app.get('/route1', (ctx) => ctx.res.json({ hooks: 'none' }));

// Add hook AFTER route definition
app.onRequest((ctx) => {
  console.log('This hook will NOT apply to route1');
});

// This route will have the hook
app.get('/route2', (ctx) => ctx.res.json({ hooks: 'yes' }));

// /route1 - No hooks applied
// /route2 - Hook applied
```

### Best Practice

Define all hooks before defining routes:

```typescript
const app = createKori()
  .onRequest((ctx) => {
    console.log('Processing request');

    // Defer completion logging
    ctx.defer(() => {
      console.log('Request completed');
    });

    // Defer cleanup operations
    ctx.defer(() => {
      console.log('Cleaning up');
    });

    return ctx.withReq({ timestamp: Date.now() });
  })
  .onError((ctx, error) => {
    console.error('Request failed:', error.message);
  });

// All routes defined after this point will use the hooks above
app.get('/users', (ctx) => ctx.res.json({ users: [] }));

app.get('/posts', (ctx) => ctx.res.json({ posts: [] }));
```

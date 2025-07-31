# Hook Execution

Understanding how hooks execute will help you build applications with predictable behavior.

## Instance Hooks

Instance hooks execute once during application lifecycle.

### Execution Order

`onInit` (app startup) → ... → `onClose` (app shutdown)

Instance hooks execute in registration order:

```typescript
const app = createKori()
  .onInit(async (ctx) => {
    console.log('Init 1: Database setup');
    return ctx.withEnv({ db: 'connected' });
  })
  .onInit(async (ctx) => {
    console.log('Init 2: Cache setup');
    return ctx.withEnv({ cache: 'connected' });
  })
  .onClose(async (ctx) => {
    console.log('Close 1: First cleanup');
  })
  .onClose(async (ctx) => {
    console.log('Close 2: Second cleanup');
  });

// Output during startup:
// Init 1: Database setup
// Init 2: Cache setup

// Output during shutdown:
// Close 1: First cleanup
// Close 2: Second cleanup
```

## Request Hooks

Request hooks execute for every matching request.

Key behaviors:

- `onResponse` and `onFinally` execute in **reverse order**
- `onRequest` can stop processing by returning a response
- Hooks are captured when you define routes, not when requests arrive

### Execution Order

`onRequest` → Route Handler → `onResponse` → `onFinally`

(`onError` only executes when an error occurs, replacing `onResponse`)

```typescript
const app = createKori()
  .onRequest((ctx) => {
    console.log('Request 1: Auth check');
    return ctx.withReq({ authenticated: true });
  })
  .onRequest((ctx) => {
    console.log('Request 2: Logging');
    return ctx.withReq({ requestId: 'abc123' });
  })
  .onResponse((ctx) => {
    console.log('Response 1: Add headers');
  })
  .onResponse((ctx) => {
    console.log('Response 2: Log response');
  })
  .onFinally((ctx) => {
    console.log('Finally 1: Metrics');
  })
  .onFinally((ctx) => {
    console.log('Finally 2: Cleanup');
  });

app.get('/example', (ctx) => {
  console.log('Handler: Processing request');
  return ctx.res.json({ message: 'Hello' });
});

// Output:
// Request 1: Auth check
// Request 2: Logging
// Handler: Processing request
// Response 2: Log response      ← Reverse order!
// Response 1: Add headers       ← Reverse order!
// Finally 2: Cleanup           ← Reverse order!
// Finally 1: Metrics           ← Reverse order!
```

### Early Response in onRequest

Use this pattern for authentication or rate limiting:

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
    return ctx.withReq({ timestamp: Date.now() });
  })
  .onResponse((ctx) => {
    console.log('Request completed');
  })
  .onError((ctx, error) => {
    console.error('Request failed:', error.message);
  })
  .onFinally((ctx) => {
    console.log('Cleaning up');
  });

// All routes defined after this point will use the hooks above
app.get('/users', (ctx) => ctx.res.json({ users: [] }));

app.get('/posts', (ctx) => ctx.res.json({ posts: [] }));
```

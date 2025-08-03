# Type-Safe Context Evolution

This guide demonstrates how Kori evolves context types through method chaining, automatically preserving and extending TypeScript type information as you build complex request processing pipelines.

## Chain Hooks for Type Safety

Use method chaining to ensure type extensions are properly inherited:

```typescript
// ✅ Good: Chained hooks preserve type extensions
const app = createKori()
  .onStart(async (ctx) => {
    const db = await connectDatabase();
    return ctx.withEnv({ db });
  })
  .onRequest((ctx) => {
    // ctx.env.db is fully typed and available
    const user = authenticateUser(ctx.req);
    return ctx.withReq({ user });
  })
  .onRequest((ctx) => {
    // Both ctx.env.db and ctx.req.user are typed
    ctx.log().info('Request', { userId: ctx.req.user?.id });
  });

// ❌ Avoid: Separate calls lose type information
const app = createKori();

app.onStart(async (ctx) => {
  const db = await connectDatabase();
  return ctx.withEnv({ db });
}); // Type extension is lost

app.onRequest(async (ctx) => {
  // TypeScript doesn't know about ctx.env.db
  const users = await ctx.env.db.getUsers(); // ❌ Type error
});
```

## Multi-Step Extensions

Build complex request processing pipelines using method chaining:

```typescript
const app = createKori()
  // 1. Authentication
  .onRequest((ctx) => {
    const user = authenticateRequest(ctx.req);
    return ctx.withReq({ user });
  })
  // 2. Request ID tracking
  .onRequest((ctx) => {
    const requestId = crypto.randomUUID();
    ctx.log().info('Request started', { requestId });
    return ctx.withReq({ requestId });
  })
  // 3. Timing
  .onRequest((ctx) => {
    const startTime = Date.now();
    return ctx.withReq({ startTime });
  })
  // 4. Response timing header
  .onRequest((ctx) => {
    return ctx.withRes({
      withTiming: () => {
        const duration = Date.now() - ctx.req.startTime;
        return ctx.res.setHeader('x-response-time', `${duration}ms`);
      },
    });
  });

// All extensions are available
app.get('/api/data', (ctx) => {
  ctx.log().info('Processing request', {
    requestId: ctx.req.requestId,
    user: ctx.req.user?.id,
  });

  return ctx.res.withTiming().json({
    message: 'Success',
    requestId: ctx.req.requestId,
  });
});
```

# Handler Context

The Handler Context manages request processing - accessing request data, building responses, and extending functionality per request. It's passed to every route handler and contains everything you need to process HTTP requests.

## What is Handler Context?

The KoriHandlerContext is passed to every route handler and gives you access to request data, response builders, and the application environment:

```typescript
type KoriHandlerContext<Env, Req, Res> = {
  env: Env; // Application environment
  req: Req; // Request object
  res: Res; // Response builder

  withReq<ReqExt>(reqExt: ReqExt): KoriHandlerContext<Env, Req & ReqExt, Res>;
  withRes<ResExt>(resExt: ResExt): KoriHandlerContext<Env, Req, Res & ResExt>;

  defer(
    callback: (ctx: KoriHandlerContext<Env, Req, Res>) => Promise<void> | void,
  ): void;

  log(): KoriLogger;
};
```

Use it for processing HTTP requests, accessing request data, building responses, and per-request logic. Handler context supports request and response extensions for adding custom functionality.

## Basic Usage

Every route handler receives a `ctx` parameter containing environment, request, and response:

```typescript
app.get('/api/users/:id', async (ctx) => {
  // ctx.env - application environment
  // ctx.req - request data and methods
  // ctx.res - response building methods

  const id = ctx.req.param('id');
  const user = await ctx.env.db.findUser(id);

  return ctx.res.json({ user });
});
```

## Application Environment (`ctx.env`)

Access shared resources configured during application initialization:

```typescript
app.get('/users', async (ctx) => {
  // Access database connection
  const users = await ctx.env.db.query('SELECT * FROM users');

  // Access configuration
  const version = ctx.env.config.apiVersion;

  return ctx.res.json({ users, version });
});
```

## Request Object (`ctx.req`)

Access all incoming request data:

```typescript
app.get('/users/:id/posts', async (ctx) => {
  // Path parameters
  const id = ctx.req.param('id');

  // Query parameters (may be undefined)
  const queries = ctx.req.queries();
  const limit = queries.limit ?? '10';
  const offset = queries.offset ?? '0';

  // Headers
  const authorization = ctx.req.header('authorization');

  // URL and method
  const url = ctx.req.url();
  const method = ctx.req.method();

  // Request body (multiple formats)
  const jsonData = await ctx.req.bodyJson();
  const textData = await ctx.req.bodyText();
  const formData = await ctx.req.bodyFormData();

  // Validated data (when using requestSchema)
  // const { ... } = ctx.req.validatedParams();
  // const { ... } = ctx.req.validatedQueries();
  // const { ... } = ctx.req.validatedHeaders();
  // const { ... } = ctx.req.validatedCookies();
  // const { ... } = ctx.req.validatedBody();

  return ctx.res.json({
    userId: id,
    query: { limit, offset },
    hasAuth: !!authorization,
  });
});
```

### Path and Query Parameters

Access parameters using convenient methods:

```typescript
app.get('/users/:id', (ctx) => {
  // Single path parameter
  const id = ctx.req.param('id');

  // Or get all path parameters as object
  const params = ctx.req.params();

  return ctx.res.json({ userId: id });
});

app.get('/search', (ctx) => {
  // Single query parameter (may be undefined)
  const searchTerm = ctx.req.query('q') ?? '';

  // All query parameters
  const allQueries = ctx.req.queries();
  // { q: 'hello', page: '1', tags: ['a', 'b'] }

  // Query parameter as array (may be undefined)
  const tags = ctx.req.queryArray('tags') ?? [];

  return ctx.res.json({ searchTerm, tags });
});
```

## Response Object (`ctx.res`)

Build HTTP responses with a fluent API:

```typescript
app.post('/users', async (ctx) => {
  const userData = await ctx.req.bodyJson();

  try {
    const user = await ctx.env.db.createUser(userData);

    return (
      ctx.res
        // Status code
        .status(201)
        // Response header
        .setHeader('location', `/users/${user.id}`)
        // Response body
        .json({ user })
    );
  } catch (error) {
    // Error response with built-in helpers
    return ctx.res.badRequest({
      message: 'Invalid user data',
      details: error.message,
    });
  }
});

// Different response types
app.get('/health', (ctx) => {
  return ctx.res.text('OK');
});

app.get('/page', (ctx) => {
  return ctx.res.html('<h1>Welcome</h1>');
});

app.delete('/users/:id', async (ctx) => {
  await ctx.env.db.deleteUser(ctx.req.param('id'));
  return ctx.res.status(204).empty();
});

// Redirect responses
app.get('/old-path', (ctx) => {
  return ctx.res.redirect('/new-path'); // 302 Found (default)
});

app.get('/moved', (ctx) => {
  return ctx.res.redirect('/permanent-location', 301); // 301 Moved Permanently
});

app.post('/form', async (ctx) => {
  await processForm(ctx);
  return ctx.res.redirect('/success', 303); // 303 See Other
});
```

## Context Extensions

Handler context supports request and response extensions through the `onRequest()` hook. Use `ctx.withReq()` and `ctx.withRes()` to add custom functionality per request.

### Request Extensions

Add custom properties to the request object:

```typescript
const app = createKori()
  // Authentication middleware
  .onRequest((ctx) => {
    const token = ctx.req.header('authorization');

    if (token) {
      const user = authenticateToken(token.replace('Bearer ', ''));
      return ctx.withReq({ currentUser: user });
    }

    return ctx.withReq({ currentUser: null });
  });

// Use in handlers
app.get('/profile', (ctx) => {
  // currentUser is now available and typed
  if (!ctx.req.currentUser) {
    return ctx.res.unauthorized({ message: 'Authentication required' });
  }

  return ctx.res.json({ user: ctx.req.currentUser });
});
```

### Response Extensions

Add custom response helpers:

```typescript
const app = createKori()
  // Custom response helpers
  .onRequest((ctx) => {
    return ctx.withRes({
      // Success wrapper
      success: (data: unknown) =>
        ctx.res.json({
          success: true,
          data,
          timestamp: new Date().toISOString(),
        }),

      // API error wrapper
      apiError: (code: string, message: string) =>
        ctx.res.status(400).json({
          success: false,
          error: { code, message },
          timestamp: new Date().toISOString(),
        }),
    });
  });

// Use custom helpers
app.get('/users', async (ctx) => {
  try {
    const users = await ctx.env.db.getUsers();
    return ctx.res.success(users); // Custom method
  } catch (error) {
    return ctx.res.apiError('FETCH_FAILED', 'Could not fetch users');
  }
});
```

## Deferred Processing (`ctx.defer()`)

Schedule tasks to run after the handler completes but before the response is returned. Commonly used in `onRequest` hooks, but also available in handlers.

### In onRequest Hook (Recommended)

```typescript
const app = createKori().onRequest((ctx) => {
  // Add request ID for tracking
  const requestId = crypto.randomUUID();

  // Schedule post-response cleanup
  ctx.defer(() => {
    // Clean up request-specific resources
    // Update metrics, close connections, etc.
  });

  return ctx.withReq({ requestId });
});
```

### In Handler (When Needed)

```typescript
app.post('/api/process', async (ctx) => {
  // Schedule cleanup for after response
  ctx.defer(() => {
    // Clean up temporary resources, update metrics, etc.
  });

  const result = await processData();
  return ctx.res.json({ result });
});
```

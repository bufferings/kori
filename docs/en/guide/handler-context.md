# Handler Context

The **Handler Context** manages request processing - accessing request data, building responses, and extending functionality per request. It's passed to every route handler and contains everything you need to process HTTP requests.

## What is Handler Context?

The **KoriHandlerContext** is passed to every route handler and gives you access to request data, response builders, and the application environment:

```typescript
type KoriHandlerContext<Env, Req, Res> = {
  env: Env; // Application environment
  req: Req; // Request object
  res: Res; // Response builder
  withReq<ReqExt>(reqExt: ReqExt): KoriHandlerContext<Env, Req & ReqExt, Res>;
  withRes<ResExt>(resExt: ResExt): KoriHandlerContext<Env, Req, Res & ResExt>;
};
```

**Perfect for:**

- Processing HTTP requests
- Accessing request data
- Building responses
- Per-request logic

Handler context supports request and response extensions for adding custom functionality.

## Basic Usage

Every route handler receives a `ctx` parameter containing environment, request, and response:

```typescript
app.get('/api/users/:id', (ctx) => {
  // ctx.env - application environment
  // ctx.req - request data and methods
  // ctx.res - response building methods

  const { id } = ctx.req.pathParams();
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
app.get('/users/:id/posts', (ctx) => {
  // Path parameters
  const { id } = ctx.req.pathParams();

  // Query parameters
  const { limit, offset } = ctx.req.queryParams();

  // Headers
  const authorization = ctx.req.header('authorization');

  // URL and method
  const url = ctx.req.url();
  const method = ctx.req.method();

  // Request body (multiple formats)
  const jsonData = await ctx.req.bodyJson();
  const textData = await ctx.req.bodyText();
  const formData = await ctx.req.bodyFormData();

  return ctx.res.json({
    userId: id,
    query: { limit, offset },
    hasAuth: !!authorization,
  });
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

app.delete('/users/:id', (ctx) => {
  await ctx.env.db.deleteUser(ctx.req.pathParams().id);
  return ctx.res.status(204).empty();
});
```

## Context Extensions

Handler context supports request and response extensions through the `onRequest()` hook. Use `ctx.withReq()` and `ctx.withRes()` to add custom functionality per request.

### Request Extensions

Add custom properties to the request object:

```typescript
import { createKori } from '@korix/kori';

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
import { createKori } from '@korix/kori';

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

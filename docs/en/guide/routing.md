# Routing

Learn how to define routes and handle different URL patterns in your Kori application. Kori wraps [Hono's SmartRouter](https://hono.dev/docs/concepts/routers#smartrouter), so routing behavior is essentially the same as Hono's.

## Basic Routing

Kori provides intuitive methods for common HTTP verbs:

```typescript
const app = createKori();

// GET route
app.get('/users', (ctx) => {
  const users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ];
  return ctx.res.json({ users });
});

// POST route
app.post('/users', async (ctx) => {
  const body = await ctx.req.bodyJson();
  const newUser = createUser(body);
  return ctx.res.json({ user: newUser });
});

// PUT route
app.put('/users/:id', async (ctx) => {
  const id = ctx.req.param('id');
  const body = await ctx.req.bodyJson();
  const user = await updateUser(id, body);
  return ctx.res.json({ user });
});

// DELETE route
app.delete('/users/:id', async (ctx) => {
  const id = ctx.req.param('id');
  await deleteUser(id);
  return ctx.res.empty();
});

// PATCH route
app.patch('/users/:id', async (ctx) => {
  const id = ctx.req.param('id');
  const body = await ctx.req.bodyJson();
  const user = await partialUpdateUser(id, body);
  return ctx.res.json({ user });
});
```

Kori also supports `.head()` and `.options()` methods for handling HEAD and OPTIONS requests.

## Path Parameters

Kori automatically infers path parameter names at compile time for better IDE support:

```typescript
// Single parameter - TypeScript infers { id: string }
app.get('/users/:id', (ctx) => {
  // ctx.req.param('id') is typed as string
  const id = ctx.req.param('id');
  return ctx.res.json({ userId: id });
});

// Multiple parameters - automatically inferred
app.get('/users/:userId/posts/:postId', (ctx) => {
  // ctx.req.params() is typed as { userId: string, postId: string }
  const { userId, postId } = ctx.req.params();
  return ctx.res.json({
    userId, // string
    postId, // string
    message: `Post ${postId} by user ${userId}`,
  });
});

// Optional parameters (with ?)
app.get('/search/:query/:page?', (ctx) => {
  // ctx.req.params() is typed as { query: string, page?: string }
  const { query, page } = ctx.req.params();
  const pageNumber = page ? parseInt(page) : 1;
  return ctx.res.json({ query, page: pageNumber });
});

// Custom regex patterns
app.get('/files/:id{[0-9]+}', (ctx) => {
  // ctx.req.param('id') is typed as string
  const id = ctx.req.param('id'); // id will match only digits
  return ctx.res.json({ fileId: id });
});
```

The type inference works by parsing the route string at compile time and extracting parameter names, helping prevent typos and improve IDE autocompletion.

Note that type inference only works when you pass the route path as a string literal directly to the route method. It does not work for:

- Routes defined with variables: `const path = '/users/:id'; app.get(path, ...)` - no inference
- Path parameters from parent routes (defined in `createChild` prefix) - these are not included in the inferred type

Only parameters defined directly in the string literal of the route method itself will be type-safe.

### Accessing Individual Parameters

When you only need one parameter, use `param(name)` for cleaner code:

```typescript
app.get('/users/:id', (ctx) => {
  // Simple and direct
  const id = ctx.req.param('id');
  return ctx.res.json({ userId: id });
});
```

For multiple parameters, use `params()` with destructuring:

```typescript
app.get('/users/:userId/posts/:postId', (ctx) => {
  const { userId, postId } = ctx.req.params();
  return ctx.res.json({ userId, postId });
});
```

## Route Groups and Children

Create modular route groups using `createChild()`:

```typescript
// Create API v1 routes
const apiV1 = app.createChild({
  prefix: '/api/v1',
  configure: (k) =>
    k
      .get('/status', (ctx) => {
        return ctx.res.json({ version: 'v1', status: 'stable' });
      })
      .get('/users', (ctx) => {
        return ctx.res.json({ users: getUsersV1() });
      }),
});

// Create API v2 routes with different behavior
const apiV2 = app.createChild({
  prefix: '/api/v2',
  configure: (k) =>
    k
      .onRequest((ctx) => {
        // Add request logging for v2 only
        ctx.log().info('API v2 request', { path: ctx.req.url().pathname });
      })
      .get('/status', (ctx) => {
        return ctx.res.json({
          version: 'v2',
          status: 'beta',
          features: ['enhanced-validation', 'better-errors'],
        });
      })
      .get('/users', (ctx) => {
        return ctx.res.json({ users: getUsersV2() });
      }),
});

// Admin routes with authentication
const adminRoutes = app.createChild({
  prefix: '/admin',
  configure: (k) =>
    k
      .onRequest((ctx) => {
        const token = ctx.req.header('authorization')?.replace('Bearer ', '');
        if (!token || !isValidAdminToken(token)) {
          return ctx.res.unauthorized({ message: 'Admin access required' });
        }
        return ctx.withReq({ isAdmin: true });
      })
      .get('/dashboard', (ctx) => {
        return ctx.res.json({ dashboard: 'admin data' });
      }),
});
```

## Route Registration Order

Routes are matched in the order they are registered. More specific routes should be defined before less specific ones:

```typescript
// ✅ Correct: specific routes first
app.get('/users/me', (ctx) => {
  return ctx.res.json({ user: getCurrentUser(ctx) });
});

app.get('/users/:id', (ctx) => {
  const id = ctx.req.param('id');
  return ctx.res.json({ user: getUserById(id) });
});

// ❌ Incorrect: this would never be reached
// app.get('/users/:id', handler);
// app.get('/users/me', handler); // Never matched!
```

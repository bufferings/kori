# Routing

Learn how to define routes and handle different URL patterns in your Kori application. Kori's routing system is built on Hono's high-performance router engine with a clean, type-safe API.

## Basic Routing

Kori provides intuitive methods for common HTTP verbs. All routes use the same handler structure with options object:

```typescript
import { createKori } from '@korix/kori';

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
  const { id } = ctx.req.pathParams();
  const body = await ctx.req.bodyJson();
  const user = await updateUser(id, body);
  return ctx.res.json({ user });
});

// DELETE route
app.delete('/users/:id', async (ctx) => {
  const { id } = ctx.req.pathParams();
  await deleteUser(id);
  return ctx.res.empty();
});

// PATCH route
app.patch('/users/:id', async (ctx) => {
  const { id } = ctx.req.pathParams();
  const body = await ctx.req.bodyJson();
  const user = await partialUpdateUser(id, body);
  return ctx.res.json({ user });
});
```

Kori also supports `.head()` and `.options()` methods for handling HEAD and OPTIONS requests.

## Path Parameters

Define dynamic route segments using the `:parameter` syntax. Path parameters are available as properties on `ctx.req.pathParams()`:

```typescript
// Single parameter
app.get('/users/:id', (ctx) => {
  // TypeScript knows pathParams() has an id property
  const { id } = ctx.req.pathParams();
  return ctx.res.json({ userId: id });
});

// Multiple parameters
app.get('/users/:userId/posts/:postId', (ctx) => {
  // TypeScript knows pathParams() has userId and postId properties
  const { userId, postId } = ctx.req.pathParams();
  return ctx.res.json({
    userId,
    postId,
    message: `Post ${postId} by user ${userId}`,
  });
});
```

## Wildcard Routes

Handle wildcard patterns for flexible routing:

```typescript
// Catch-all route for static files
app.get('/static/*', (ctx) => {
  const url = ctx.req.url();
  const filePath = url.pathname.replace('/static/', '');

  // Handle static file serving
  return ctx.res.text(`Serving: ${filePath}`);
});

// API versioning with wildcards
app.get('/api/*/status', (ctx) => {
  const url = ctx.req.url();
  const pathSegments = url.pathname.split('/');
  const version = pathSegments[2]; // Extract version from /api/{version}/status

  return ctx.res.json({
    version,
    status: 'healthy',
  });
});
```

## Route Options

Routes can accept various options for validation, metadata, and error handling:

```typescript
import { zodRequestSchema } from '@korix/zod-schema';
import { createKoriZodRequestValidator } from '@korix/zod-validator';
import { z } from 'zod/v4';

const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
});

app.post('/users', {
  // Request validation schema
  requestSchema: zodRequestSchema({
    body: z.object({
      name: z.string().min(1).max(100),
      email: z.string().email(),
      age: z.number().min(18).max(120),
    }),
    headers: z.object({
      'x-client-version': z.string().optional(),
    }),
  }),

  // Route-specific validation error handler
  onRequestValidationError: (ctx, errors) => {
    ctx.req.log().warn('User creation validation failed', { errors });
    return ctx.res.badRequest({ message: 'Invalid user data' });
  },

  // Plugin metadata (useful for OpenAPI, etc.)
  pluginMetadata: {
    summary: 'Create a new user',
    description: 'Creates a new user account with validation',
    tags: ['Users'],
  },

  // Main handler
  handler: (ctx) => {
    // ctx.req.validated contains validated data
    const { name, email, age } = ctx.req.validatedBody();
    const clientVersion = ctx.req.validatedHeaders()['x-client-version'];

    const user = createUser({ name, email, age });

    return ctx.res.status(HttpStatus.CREATED).json({
      user,
      clientVersion,
    });
  },
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
        ctx.req.log().info('API v2 request', { path: ctx.req.url().pathname });
        return ctx; // Must return context
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
          throw new Error('Unauthorized');
        }
        return ctx.withReq({ isAdmin: true });
      })
      .onError((ctx, err) => {
        if (err instanceof Error && err.message === 'Unauthorized') {
          return ctx.res.unauthorized({ message: 'Admin access required' });
        }
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
  const { id } = ctx.req.pathParams();
  return ctx.res.json({ user: getUserById(id) });
});

// ❌ Incorrect: this would never be reached
// app.get('/users/:id', handler);
// app.get('/users/me', handler); // Never matched!
```

## Advanced Routing Patterns

### Conditional Routing

```typescript
app.get('/content/:type/:id', async (ctx) => {
  const { type, id } = ctx.req.pathParams();

  switch (type) {
    case 'post':
      const post = await getPost(id);
      return ctx.res.json({ post });

    case 'page':
      const page = await getPage(id);
      return ctx.res.json({ page });

    case 'product':
      const product = await getProduct(id);
      return ctx.res.json({ product });

    default:
      return ctx.res.notFound({ message: `Unknown content type: ${type}` });
  }
});
```

### Route-specific Middleware via Hooks

```typescript
app.get('/protected/:resource', (ctx) => {
  // This runs after onRequest hooks
  const { resource } = ctx.req.pathParams();
  return ctx.res.json({ resource, authorized: true });
});

// Add authentication to specific routes by creating a child
const protectedRoutes = app.createChild({
  configure: (k) =>
    k
      .onRequest((ctx) => {
        const token = ctx.req.header('authorization');
        if (!token) {
          throw new Error('No token provided');
        }

        const user = validateToken(token);
        if (!user) {
          throw new Error('Invalid token');
        }

        return ctx.withReq({ currentUser: user });
      })
      .onError((ctx, err) => {
        if (err instanceof Error && err.message.includes('token')) {
          return ctx.res.unauthorized({ message: 'Authentication required' });
        }
      }),
});

protectedRoutes.get('/profile', (ctx) => {
  return ctx.res.json({ user: ctx.req.currentUser });
});
```

## Performance Considerations

1. **Route Order**: Define specific routes before generic ones
2. **Parameter Extraction**: Path parameters are pre-parsed and cached
3. **Router Engine**: Built on Hono's high-performance router
4. **Pattern Matching**: Use simple patterns when possible for best performance

```typescript
// ✅ Efficient patterns
app.get('/users/:id', handler); // Simple parameter
app.get('/api/v1/users', handler); // Static segments

// ⚠️ More complex (still fast, but slightly slower)
app.get('/files/:category/:year/:month/:file', handler); // Many parameters
app.get('/api/*/users/*', handler); // Wildcards
```

## Error Handling in Routes

Handle route-specific errors gracefully:

```typescript
app.get('/users/:id', async (ctx) => {
  const { id } = ctx.req.pathParams();

  try {
    const user = await database.user.findById(id);

    if (!user) {
      return ctx.res.notFound({ message: 'User not found' });
    }

    return ctx.res.json({ user });
  } catch (error) {
    ctx.req.log().error('Database error', { error, userId: id });
    return ctx.res.internalError({ message: 'Database error' });
  }
});
```

## Next Steps

- [Learn about the plugin system](/en/guide/plugins)
- [Set up request validation](/en/guide/validation)
- [Configure hooks and middleware](/en/guide/hooks)

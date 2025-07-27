# Context API Reference

The `KoriHandlerContext` (commonly referred to as `ctx`) is the main object passed to every route handler, containing request data, response builders, and environment information.

## Type Definition

```typescript
type KoriHandlerContext<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse> = {
  env: Env;
  req: Req;
  res: Res;
  withReq<ReqExt>(reqExt: ReqExt): KoriHandlerContext<Env, Req & ReqExt, Res>;
  withRes<ResExt>(resExt: ResExt): KoriHandlerContext<Env, Req, Res & ResExt>;
};
```

## Properties

### `ctx.env`

Application environment containing shared state and dependencies.

```typescript
app.onInit(async (ctx) => {
  const db = await connectDatabase();
  return ctx.withEnv({ db });
});

app.get('/users', {
  handler: (ctx) => {
    // Access database from environment
    const users = await ctx.env.db.findMany('users');
    return ctx.res.json({ users });
  },
});
```

**Common patterns:**

- Database connections
- Configuration values
- Shared services
- Caches and pools

### `ctx.req`

Request object containing all incoming HTTP request data.

```typescript
app.get('/users/:id', {
  handler: (ctx) => {
    // Path parameters
    const { id } = ctx.req.pathParams;

    // Query parameters
    const { include } = ctx.req.queryParams();

    // Headers
    const authorization = ctx.req.header('authorization');

    // Request method and URL
    console.log(`${ctx.req.method()} ${ctx.req.url().pathname}`);

    return ctx.res.json({ userId: id, include, hasAuth: !!authorization });
  },
});
```

**See:** [Request API Reference](/en/core/request) for complete request methods.

### `ctx.res`

Response builder for creating HTTP responses.

```typescript
app.post('/users', {
  handler: async (ctx) => {
    const userData = await ctx.req.bodyJson();

    try {
      const user = await createUser(userData);

      // Success response with status
      return ctx.res.status(201).setHeader('location', `/users/${user.id}`).json({ user });
    } catch (error) {
      // Error response with built-in helper
      return ctx.res.badRequest({
        error: 'Invalid user data',
        details: error.message,
      });
    }
  },
});
```

**See:** [Response API Reference](/en/core/response) for complete response methods.

## Extension Methods

### `ctx.withReq(extension)`

Extend the request object with additional properties. Useful for middleware-like functionality.

```typescript
// Add user authentication
const authenticatedApp = app.onRequest((ctx) => {
  const token = ctx.req.header('authorization');

  if (token) {
    const user = authenticateToken(token.replace('Bearer ', ''));
    return ctx.withReq({ currentUser: user });
  }

  return ctx;
});

authenticatedApp.get('/profile', {
  handler: (ctx) => {
    // currentUser is now available and typed
    if (!ctx.req.currentUser) {
      return ctx.res.unauthorized({ message: 'Authentication required' });
    }

    return ctx.res.json({ user: ctx.req.currentUser });
  },
});
```

#### Type Safety

Extensions are fully type-safe:

```typescript
// TypeScript knows about the extension
type UserExtension = { currentUser: User | null };

const appWithUser = app.onRequest((ctx): KoriHandlerContext<Env, Req & UserExtension, Res> => {
  const user = authenticateUser(ctx.req);
  return ctx.withReq({ currentUser: user });
});

// In handlers, currentUser is typed correctly
appWithUser.get('/profile', {
  handler: (ctx) => {
    // TypeScript knows ctx.req.currentUser exists and is User | null
    const user = ctx.req.currentUser;
    // ...
  },
});
```

### `ctx.withRes(extension)`

Extend the response object with additional capabilities.

```typescript
// Add custom response helpers
const appWithHelpers = app.onRequest((ctx) => {
  return ctx.withRes({
    // Custom success response
    success: (data: unknown) =>
      ctx.res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      }),

    // Custom error response
    apiError: (code: string, message: string) =>
      ctx.res.status(400).json({
        success: false,
        error: { code, message },
        timestamp: new Date().toISOString(),
      }),
  });
});

appWithHelpers.get('/users', {
  handler: async (ctx) => {
    try {
      const users = await getUsers();
      return ctx.res.success(users); // Custom method available
    } catch (error) {
      return ctx.res.apiError('FETCH_FAILED', 'Could not fetch users');
    }
  },
});
```

## Advanced Usage Patterns

### Request Flow Extensions

Build complex request processing pipelines:

```typescript
// 1. Authentication
app.onRequest((ctx) => {
  const user = authenticateRequest(ctx.req);
  return ctx.withReq({ user });
});

// 2. Request ID tracking
app.onRequest((ctx) => {
  const requestId = crypto.randomUUID();
  ctx.req.log().info('Request started', { requestId });
  return ctx.withReq({ requestId });
});

// 3. Timing
app.onRequest((ctx) => {
  const startTime = Date.now();
  return ctx.withReq({ startTime });
});

// 4. Custom response helpers
app.onRequest((ctx) => {
  return ctx.withRes({
    withTiming: () => {
      const duration = Date.now() - ctx.req.startTime;
      return ctx.res.setHeader('x-response-time', `${duration}ms`);
    },
  });
});

// Handler with full context
app.get('/complex', {
  handler: (ctx) => {
    // All extensions are available and typed
    ctx.req.log().info('Processing request', {
      requestId: ctx.req.requestId,
      user: ctx.req.user?.id,
    });

    return ctx.res.withTiming().json({
      message: 'Hello',
      user: ctx.req.user,
      requestId: ctx.req.requestId,
    });
  },
});
```

### Plugin-Based Extensions

Plugins can extend context in a reusable way:

```typescript
const timingPlugin = defineKoriPlugin({
  name: 'timing',
  apply: (kori) =>
    kori
      .onRequest((ctx) => {
        return ctx.withReq({ startTime: Date.now() });
      })
      .onResponse((ctx) => {
        const duration = Date.now() - ctx.req.startTime;
        ctx.res.setHeader('x-response-time', `${duration}ms`);
      }),
});

const authPlugin = defineKoriPlugin({
  name: 'auth',
  apply: (kori) =>
    kori.onRequest((ctx) => {
      const user = authenticateRequest(ctx.req);
      return ctx.withReq({ user });
    }),
});

// Apply plugins
app.applyPlugin(timingPlugin()).applyPlugin(authPlugin());

// All handlers automatically get timing and auth
app.get('/protected', {
  handler: (ctx) => {
    // ctx.req.startTime and ctx.req.user are available
    return ctx.res.json({ user: ctx.req.user });
  },
});
```

### Conditional Extensions

Apply extensions based on request conditions:

```typescript
app.onRequest((ctx) => {
  const path = ctx.req.url().pathname;

  // Add admin context for admin routes
  if (path.startsWith('/admin')) {
    const adminUser = authenticateAdmin(ctx.req);
    return ctx.withReq({
      adminUser,
      isAdminRoute: true as const,
    });
  }

  // Add regular user context
  const user = authenticateUser(ctx.req);
  return ctx.withReq({
    user,
    isAdminRoute: false as const,
  });
});

app.get('/admin/users', {
  handler: (ctx) => {
    // TypeScript can narrow types based on isAdminRoute
    if (ctx.req.isAdminRoute) {
      // ctx.req.adminUser is available
      const users = await getUsers(ctx.req.adminUser);
      return ctx.res.json({ users });
    }

    return ctx.res.forbidden({ message: 'Admin access required' });
  },
});
```

## Environment Management

### Application State

Store shared application state in the environment:

```typescript
type AppEnvironment = {
  db: Database;
  redis: Redis;
  config: AppConfig;
  metrics: MetricsCollector;
};

app.onInit(async (ctx) => {
  const db = await connectDatabase();
  const redis = await connectRedis();
  const config = loadConfig();
  const metrics = new MetricsCollector();

  return ctx.withEnv({
    db,
    redis,
    config,
    metrics,
  } satisfies AppEnvironment);
});

app.get('/stats', {
  handler: (ctx) => {
    // Fully typed environment access
    const stats = ctx.env.metrics.getStats();
    return ctx.res.json({ stats });
  },
});
```

### Request-Scoped Resources

Manage resources that should be cleaned up per request:

```typescript
app.onRequest((ctx) => {
  const tempFiles: string[] = [];
  return ctx.withReq({ tempFiles });
});

app.onFinally((ctx) => {
  // Clean up request-scoped resources
  ctx.req.tempFiles?.forEach((file) => {
    fs.unlink(file).catch(console.error);
  });
});

app.post('/process-file', {
  handler: async (ctx) => {
    const file = await ctx.req.bodyFormData();
    const tempPath = await saveTempFile(file);

    // Track temp file for cleanup
    ctx.req.tempFiles.push(tempPath);

    const result = await processFile(tempPath);
    return ctx.res.json({ result });
  },
});
```

## Error Handling Context

Context is available in error handlers:

```typescript
app.onError((ctx, error) => {
  // Log with request context
  ctx.req.log().error('Request failed', {
    error: error.message,
    path: ctx.req.url().pathname,
    method: ctx.req.method(),
    user: ctx.req.user?.id,
    requestId: ctx.req.requestId,
  });

  // Respond with context-aware error
  if (!ctx.res.isReady()) {
    return ctx.res.internalError({
      message: 'Internal server error',
      requestId: ctx.req.requestId,
    });
  }
});
```

## Testing Context

Mock context for testing:

```typescript
import { createKoriHandlerContext } from '@korix/kori';

describe('User Handler', () => {
  it('should handle user creation', async () => {
    // Create mock context
    const mockCtx = createKoriHandlerContext({
      env: { db: mockDatabase },
      req: mockRequest({
        body: { name: 'John', email: 'john@example.com' },
      }),
      res: mockResponse(),
    });

    const result = await createUserHandler(mockCtx);
    expect(result.status).toBe(201);
  });
});
```

## Best Practices

### 1. Type-Safe Extensions

Always type your extensions properly:

```typescript
// Good: Explicit typing
type AuthExtension = { user: User | null };
type TimingExtension = { startTime: number };

const extendedCtx: KoriHandlerContext<Env, Req & AuthExtension & TimingExtension, Res> = ctx.withReq({
  user,
  startTime,
});

// Better: Use helper types
type ExtendRequest<T> = KoriHandlerContext<Env, Req & T, Res>;

const typedCtx: ExtendRequest<AuthExtension & TimingExtension> = ctx.withReq({ user, startTime });
```

### 2. Minimal Extensions

Only extend context with what you need:

```typescript
// Good: Minimal, focused extension
app.onRequest((ctx) => {
  const user = authenticateUser(ctx.req);
  return ctx.withReq({ user });
});

// Avoid: Large, unfocused extensions
app.onRequest((ctx) => {
  return ctx.withReq({
    user: authenticateUser(ctx.req),
    permissions: getUserPermissions(),
    preferences: getUserPreferences(),
    analytics: getAnalyticsData(),
    // Too much data attached
  });
});
```

### 3. Plugin Composition

Use plugins for reusable context extensions:

```typescript
// Create focused plugins
const authPlugin = () =>
  defineKoriPlugin({
    name: 'auth',
    apply: (kori) =>
      kori.onRequest((ctx) => {
        const user = authenticateUser(ctx.req);
        return ctx.withReq({ user });
      }),
  });

const requestIdPlugin = () =>
  defineKoriPlugin({
    name: 'request-id',
    apply: (kori) =>
      kori.onRequest((ctx) => {
        const requestId = generateRequestId();
        return ctx.withReq({ requestId });
      }),
  });

// Compose plugins
app.applyPlugin(authPlugin()).applyPlugin(requestIdPlugin());
```

### 4. Conditional Logic

Handle optional extensions gracefully:

```typescript
app.onRequest((ctx) => {
  const token = ctx.req.header('authorization');

  if (token) {
    const user = verifyToken(token);
    return ctx.withReq({ user, isAuthenticated: true as const });
  }

  return ctx.withReq({ user: null, isAuthenticated: false as const });
});

app.get('/profile', {
  handler: (ctx) => {
    if (!ctx.req.isAuthenticated) {
      return ctx.res.unauthorized({ message: 'Authentication required' });
    }

    // TypeScript knows user is not null when isAuthenticated is true
    return ctx.res.json({ user: ctx.req.user });
  },
});
```

## Performance Considerations

### Avoid Deep Object Copies

Extensions use `Object.assign`, so avoid deeply nested objects:

```typescript
// Good: Flat extensions
ctx.withReq({
  userId: user.id,
  userRole: user.role,
});

// Avoid: Deep nested objects
ctx.withReq({
  userContext: {
    user: user,
    permissions: user.permissions,
    preferences: user.preferences,
  },
});
```

### Cache Expensive Operations

Don't recompute expensive values in every handler:

```typescript
// Good: Compute once in onRequest
app.onRequest(async (ctx) => {
  const user = await authenticateUser(ctx.req);
  const permissions = await getUserPermissions(user);

  return ctx.withReq({ user, permissions });
});

// Avoid: Computing in every handler
app.get('/data', {
  handler: async (ctx) => {
    const user = await authenticateUser(ctx.req); // Redundant
    const permissions = await getUserPermissions(user); // Expensive
    // ...
  },
});
```

## Next Steps

- [Request API Reference](/en/core/request) - Complete request object documentation
- [Response API Reference](/en/core/response) - Complete response object documentation
- [Hooks Guide](/en/guide/hooks) - Lifecycle hooks and context extensions
- [Plugin Development](/en/guide/plugins) - Creating reusable context extensions

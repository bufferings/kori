# Context

Kori provides two distinct context objects that correspond to different phases of your application lifecycle. Understanding when and how to use each context is essential for building robust applications.

## Context Types

### Instance Context (Application Lifecycle)

The **KoriInstanceContext** is used during application initialization and shutdown. It manages application-wide state and shared resources.

```typescript
type KoriInstanceContext<Env extends KoriEnvironment> = {
  env: Env;
  withEnv<EnvExt>(envExt: EnvExt): KoriInstanceContext<Env & EnvExt>;
};
```

**When to use:**

- Setting up database connections
- Loading configuration
- Initializing shared services
- Application shutdown cleanup

### Handler Context (Request Lifecycle)

The **KoriHandlerContext** is passed to every route handler and contains request data, response builders, and the application environment.

```typescript
type KoriHandlerContext<Env, Req, Res> = {
  env: Env; // Application environment
  req: Req; // Request object
  res: Res; // Response builder
  withReq<ReqExt>(reqExt: ReqExt): KoriHandlerContext<Env, Req & ReqExt, Res>;
  withRes<ResExt>(resExt: ResExt): KoriHandlerContext<Env, Req, Res & ResExt>;
};
```

**When to use:**

- Processing HTTP requests
- Accessing request data
- Building responses
- Per-request logic

## Instance Context Usage

### Application Initialization

Use `app.onInit()` to set up your application environment:

```typescript
import { createKori } from '@korix/kori';

const app = createKori();

// Initialize database and shared services
app.onInit(async (ctx) => {
  console.log('Initializing application...');

  // Set up database connection
  const db = await connectDatabase({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
  });

  // Initialize Redis cache
  const cache = await connectRedis({
    url: process.env.REDIS_URL,
  });

  // Load configuration
  const config = {
    apiVersion: 'v1',
    rateLimit: 1000,
    environment: process.env.NODE_ENV,
  };

  // Return extended environment
  return ctx.withEnv({
    db,
    cache,
    config,
  });
});
```

### Application Shutdown

Clean up resources when the application shuts down:

```typescript
app.onClose(async (ctx) => {
  console.log('Shutting down application...');

  // Close database connections
  await ctx.env.db.close();

  // Close cache connections
  await ctx.env.cache.disconnect();

  console.log('Application shutdown complete');
});
```

### Environment Type Safety

The environment is fully typed across your application:

```typescript
// Define your environment type
type AppEnvironment = {
  db: Database;
  cache: Redis;
  config: AppConfig;
};

// TypeScript knows about your environment
app.onInit(async (ctx): Promise<KoriInstanceContext<AppEnvironment>> => {
  const db = await connectDatabase();
  const cache = await connectRedis();
  const config = loadConfig();

  return ctx.withEnv({ db, cache, config });
});

// Environment is available in all handlers
app.get('/users', {
  handler: async (ctx) => {
    // TypeScript knows ctx.env.db exists
    const users = await ctx.env.db.query('SELECT * FROM users');
    return ctx.res.json({ users });
  },
});
```

## Handler Context Usage

Every route handler receives a `ctx` parameter containing request, response, and environment:

```typescript
app.get('/api/users/:id', {
  handler: (ctx) => {
    // ctx.env - application environment
    // ctx.req - request data and methods
    // ctx.res - response building methods

    const { id } = ctx.req.pathParams;
    const user = await ctx.env.db.findUser(id);

    return ctx.res.json({ user });
  },
});
```

### Request Object (`ctx.req`)

Access all incoming request data with automatic caching:

```typescript
app.get('/users/:id/posts', {
  handler: (ctx) => {
    // Path parameters (object, not function!)
    const { id } = ctx.req.pathParams;

    // Query parameters (function that returns object)
    const { limit, offset } = ctx.req.queryParams();

    // Headers
    const authorization = ctx.req.header('authorization');
    const contentType = ctx.req.contentType();

    // URL and method
    const url = ctx.req.url();
    const method = ctx.req.method();

    // Request body (multiple formats)
    const jsonData = await ctx.req.bodyJson();
    const textData = await ctx.req.bodyText();
    const formData = await ctx.req.bodyFormData();

    // Auto-parse based on Content-Type
    const parsed = await ctx.req.parseBody();

    return ctx.res.json({
      userId: id,
      query: { limit, offset },
      hasAuth: !!authorization,
    });
  },
});
```

### Response Object (`ctx.res`)

Build HTTP responses with a fluent API:

```typescript
app.post('/users', {
  handler: async (ctx) => {
    const userData = await ctx.req.bodyJson();

    try {
      const user = await ctx.env.db.createUser(userData);

      // Success response with status and headers
      return ctx.res.status(201).setHeader('location', `/users/${user.id}`).json({ user });
    } catch (error) {
      // Error response with built-in helpers
      return ctx.res.badRequest({
        message: 'Invalid user data',
        details: error.message,
      });
    }
  },
});

// Different response types
app.get('/health', {
  handler: (ctx) => {
    return ctx.res.text('OK');
  },
});

app.get('/page', {
  handler: (ctx) => {
    return ctx.res.html('<h1>Welcome</h1>');
  },
});

app.delete('/users/:id', {
  handler: (ctx) => {
    await ctx.env.db.deleteUser(ctx.req.pathParams.id);
    return ctx.res.status(204).empty();
  },
});
```

## Context Extension

Both context types support extension for adding custom functionality.

### Request Extensions

Add custom properties to the request object:

```typescript
// Authentication middleware
app.onRequest((ctx) => {
  const token = ctx.req.header('authorization');

  if (token) {
    const user = authenticateToken(token.replace('Bearer ', ''));
    return ctx.withReq({ currentUser: user });
  }

  return ctx.withReq({ currentUser: null });
});

// Use in handlers
app.get('/profile', {
  handler: (ctx) => {
    // currentUser is now available and typed
    if (!ctx.req.currentUser) {
      return ctx.res.unauthorized({ message: 'Authentication required' });
    }

    return ctx.res.json({ user: ctx.req.currentUser });
  },
});
```

### Response Extensions

Add custom response helpers:

```typescript
// Custom response helpers
app.onRequest((ctx) => {
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
app.get('/users', {
  handler: async (ctx) => {
    try {
      const users = await ctx.env.db.getUsers();
      return ctx.res.success(users); // Custom method
    } catch (error) {
      return ctx.res.apiError('FETCH_FAILED', 'Could not fetch users');
    }
  },
});
```

### Multi-Step Extensions

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

// 4. Response timing header
app.onRequest((ctx) => {
  return ctx.withRes({
    withTiming: () => {
      const duration = Date.now() - ctx.req.startTime;
      return ctx.res.setHeader('x-response-time', `${duration}ms`);
    },
  });
});

// All extensions are available
app.get('/api/data', {
  handler: (ctx) => {
    ctx.req.log().info('Processing request', {
      requestId: ctx.req.requestId,
      user: ctx.req.user?.id,
    });

    return ctx.res.withTiming().json({
      message: 'Success',
      requestId: ctx.req.requestId,
    });
  },
});
```

## Request Validation

When using request validation, validated data is available on `ctx.req.validated`:

```typescript
import { zodRequestSchema } from '@korix/zod-schema';
import { createKoriZodRequestValidator } from '@korix/zod-validator';
import { z } from 'zod/v4';

const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
});

const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(18),
});

app.post('/users', {
  requestSchema: zodRequestSchema({
    body: CreateUserSchema,
    headers: z.object({
      'x-client-version': z.string().optional(),
    }),
  }),
  handler: (ctx) => {
    // All validated and fully typed!
    const { name, email, age } = ctx.req.validated.body;
    const { 'x-client-version': clientVersion } = ctx.req.validated.headers;

    const user = {
      id: crypto.randomUUID(),
      name,
      email,
      age,
      clientVersion,
      createdAt: new Date().toISOString(),
    };

    return ctx.res.status(201).json({ user });
  },
});
```

## Error Handling

Context is available in error handlers with automatic content negotiation:

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

// Error responses automatically negotiate content type
app.get('/error-demo', {
  handler: (ctx) => {
    // Client sends Accept: application/json → JSON error
    // Client sends Accept: text/html → HTML error page
    // Client sends Accept: text/plain → Plain text error
    // Default → JSON

    return ctx.res.badRequest({
      message: 'Something went wrong',
    });
  },
});
```

## Performance Features

Kori optimizes context usage for performance:

1. **Request data is cached**: Methods like `headers()`, `cookies()`, and `queryParams()` cache results
2. **Body methods are cached**: Multiple calls to `bodyJson()` return the same Promise
3. **Path params are pre-parsed**: `ctx.req.pathParams` is immediately available
4. **URL is cached**: `ctx.req.url()` caches the URL object
5. **Lazy initialization**: Properties are computed only when accessed

## Best Practices

### 1. Separate Concerns

Use instance context for application setup, handler context for request processing:

```typescript
// ✅ Good: Application setup in onInit
app.onInit(async (ctx) => {
  const db = await connectDatabase();
  return ctx.withEnv({ db });
});

// ✅ Good: Request processing in handlers
app.get('/users', {
  handler: async (ctx) => {
    const users = await ctx.env.db.getUsers();
    return ctx.res.json({ users });
  },
});

// ❌ Avoid: Database setup in every handler
app.get('/users', {
  handler: async (ctx) => {
    const db = await connectDatabase(); // Expensive!
    const users = await db.getUsers();
    return ctx.res.json({ users });
  },
});
```

### 2. Type Your Extensions

Always provide proper types for context extensions:

```typescript
// ✅ Good: Explicit typing
type AuthExtension = { currentUser: User | null };

const extendedCtx = ctx.withReq({
  currentUser: user,
} satisfies AuthExtension);

// ✅ Better: Use helper types
type ExtendRequest<T> = KoriHandlerContext<Env, Req & T, Res>;

const typedCtx: ExtendRequest<AuthExtension> = ctx.withReq({ currentUser: user });
```

### 3. Minimal Extensions

Only extend context with what you need:

```typescript
// ✅ Good: Focused extension
app.onRequest((ctx) => {
  const user = authenticateUser(ctx.req);
  return ctx.withReq({ user });
});

// ❌ Avoid: Large, unfocused extensions
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

## Next Steps

- [Request API Reference](/en/core/request) - Complete request object documentation
- [Response API Reference](/en/core/response) - Complete response object documentation
- [Context API Reference](/en/core/context) - Detailed API reference
- [Hooks Guide](/en/guide/hooks) - Lifecycle hooks and context extensions
- [Plugin Development](/en/guide/plugins) - Creating reusable context extensions

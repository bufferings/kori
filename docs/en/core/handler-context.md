# Handler Context API Reference

The `KoriHandlerContext` is the core object passed to every route handler, containing request data, response builders, and environment access with powerful extension capabilities.

## Type Definition

```typescript
type KoriHandlerContext<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
> = {
  env: Env;
  req: Req;
  res: Res;
  withReq<ReqExt>(reqExt: ReqExt): KoriHandlerContext<Env, Req & ReqExt, Res>;
  withRes<ResExt>(resExt: ResExt): KoriHandlerContext<Env, Req, Res & ResExt>;
};
```

## Core Properties

### `ctx.env`

Application environment containing shared state and dependencies configured during initialization.

```typescript
app.onInit(async (ctx) => {
  const db = await connectDatabase();
  const redis = await connectRedis();
  return ctx.withEnv({ db, redis });
});

app.get('/users', (ctx) => {
  // Fully typed environment access
  const users = await ctx.env.db.findMany('users');
  const cached = await ctx.env.redis.get('users');
  return ctx.res.json({ users, cached });
});
```

**Common patterns:**

- Database connections
- Configuration values
- Shared services and clients
- Caches and connection pools
- Feature flags and settings

### `ctx.req`

Request object providing access to all incoming HTTP request data with type-safe methods.

```typescript
app.get('/users/:id', (ctx) => {
  // Path parameters (typed based on route pattern)
  const { id } = ctx.req.pathParams();

  // Query parameters
  const { include, limit = '10' } = ctx.req.queryParams();

  // Headers (case-insensitive)
  const authorization = ctx.req.header('authorization');
  const contentType = ctx.req.header('content-type');

  // URL and method information
  const url = ctx.req.url();
  const method = ctx.req.method();

  // Request body (content-type aware)
  const jsonData = await ctx.req.bodyJson();
  const textData = await ctx.req.bodyText();
  const formData = await ctx.req.bodyFormData();

  return ctx.res.json({
    userId: id,
    query: { include, limit: parseInt(limit) },
    hasAuth: !!authorization,
    requestInfo: {
      method,
      pathname: url.pathname,
      search: url.search,
    },
  });
});
```

**See:** [Request API Reference](/en/core/request) for complete request methods.

### `ctx.res`

Response builder providing a fluent API for creating HTTP responses with type safety.

```typescript
app.post('/users', async (ctx) => {
  const userData = await ctx.req.bodyJson();

  try {
    const user = await createUser(userData);

    // Fluent response building
    return ctx.res
      .status(201)
      .setHeader('location', `/users/${user.id}`)
      .setHeader('x-created-at', new Date().toISOString())
      .json({ user });
  } catch (error) {
    // Built-in error response helpers
    if (error.code === 'VALIDATION_ERROR') {
      return ctx.res.badRequest({
        error: 'Invalid user data',
        details: error.details,
      });
    }

    return ctx.res.internalError({
      error: 'Failed to create user',
      requestId: ctx.req.header('x-request-id'),
    });
  }
});
```

**See:** [Response API Reference](/en/core/response) for complete response methods.

## Extension Methods

### `ctx.withReq(extension)`

Extend the request object with additional properties, maintaining full type safety.

```typescript
// Authentication extension
const authApp = app.onRequest((ctx) => {
  const token = ctx.req.header('authorization');

  if (token) {
    const user = authenticateToken(token.replace('Bearer ', ''));
    return ctx.withReq({
      currentUser: user,
      isAuthenticated: true as const,
    });
  }

  return ctx.withReq({
    currentUser: null,
    isAuthenticated: false as const,
  });
});

authApp.get('/profile', (ctx) => {
  // Type-safe access to extensions
  if (!ctx.req.isAuthenticated) {
    return ctx.res.unauthorized({ message: 'Authentication required' });
  }

  // TypeScript knows currentUser is not null
  return ctx.res.json({
    user: ctx.req.currentUser,
    permissions: ctx.req.currentUser.permissions,
  });
});
```

#### Advanced Extension Patterns

**Request tracking:**

```typescript
app.onRequest((ctx) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  ctx.req.log().info('Request started', { requestId });

  return ctx.withReq({
    requestId,
    startTime,
    metrics: {
      trackOperation: (name: string) => {
        const duration = Date.now() - startTime;
        ctx.req.log().info('Operation completed', {
          requestId,
          operation: name,
          duration,
        });
      },
    },
  });
});

app.get('/complex-operation', async (ctx) => {
  ctx.req.metrics.trackOperation('auth-check');
  const user = await authenticateUser(ctx.req);

  ctx.req.metrics.trackOperation('data-fetch');
  const data = await fetchUserData(user.id);

  return ctx.res.json({ data });
});
```

**Conditional extensions:**

```typescript
app.onRequest((ctx) => {
  const userAgent = ctx.req.header('user-agent') || '';

  if (userAgent.includes('Mobile')) {
    return ctx.withReq({
      deviceType: 'mobile' as const,
      maxItems: 10,
    });
  }

  return ctx.withReq({
    deviceType: 'desktop' as const,
    maxItems: 50,
  });
});

app.get('/content', (ctx) => {
  // Type narrows based on deviceType
  const items = await getContent({
    limit: ctx.req.maxItems,
    optimized: ctx.req.deviceType === 'mobile',
  });

  return ctx.res.json({ items });
});
```

### `ctx.withRes(extension)`

Extend the response object with custom helpers and methods.

```typescript
const apiApp = app.onRequest((ctx) => {
  return ctx.withRes({
    // Standardized success responses
    success: <T>(data: T, meta?: Record<string, unknown>) =>
      ctx.res.json({
        success: true,
        data,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: ctx.req.requestId,
          ...meta,
        },
      }),

    // Standardized error responses
    apiError: (code: string, message: string, statusCode = 400) =>
      ctx.res.status(statusCode).json({
        success: false,
        error: {
          code,
          message,
          timestamp: new Date().toISOString(),
          requestId: ctx.req.requestId,
        },
      }),

    // Pagination helpers
    paginated: <T>(items: T[], pagination: PaginationInfo) =>
      ctx.res.success(items, {
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          hasNext: pagination.page * pagination.limit < pagination.total,
        },
      }),
  });
});

apiApp.get('/users', async (ctx) => {
  try {
    const { page = 1, limit = 20 } = ctx.req.queryParams();
    const { users, total } = await getUsersPaginated({ page, limit });

    return ctx.res.paginated(users, { page, limit, total });
  } catch (error) {
    return ctx.res.apiError('FETCH_FAILED', 'Could not fetch users', 500);
  }
});
```

## Advanced Usage Patterns

### Complex Request Processing Pipelines

Build sophisticated request processing with multiple extensions:

```typescript
app
  // 1. Request ID and timing
  .onRequest((ctx) => {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    return ctx.withReq({ requestId, startTime });
  })

  // 2. Authentication
  .onRequest((ctx) => {
    const user = authenticateRequest(ctx.req);
    return ctx.withReq({ user, isAuthenticated: !!user });
  })

  // 3. Authorization
  .onRequest((ctx) => {
    const permissions = ctx.req.isAuthenticated
      ? getUserPermissions(ctx.req.user)
      : [];
    return ctx.withReq({ permissions });
  })

  // 4. Rate limiting
  .onRequest(async (ctx) => {
    const rateLimitInfo = await checkRateLimit({
      userId: ctx.req.user?.id,
      ip: ctx.req.header('x-forwarded-for'),
    });
    return ctx.withReq({ rateLimitInfo });
  })

  // 5. Response helpers
  .onRequest((ctx) => {
    return ctx.withRes({
      withTiming: () => {
        const duration = Date.now() - ctx.req.startTime;
        return ctx.res.setHeader('x-response-time', `${duration}ms`);
      },
      withRateLimit: () => {
        const { limit, remaining, resetTime } = ctx.req.rateLimitInfo;
        return ctx.res
          .setHeader('x-ratelimit-limit', limit.toString())
          .setHeader('x-ratelimit-remaining', remaining.toString())
          .setHeader('x-ratelimit-reset', resetTime.toString());
      },
    });
  });

// Handler with full pipeline context
app.get('/protected-resource', (ctx) => {
  // All extensions are available and typed
  if (!ctx.req.isAuthenticated) {
    return ctx.res.unauthorized({ message: 'Authentication required' });
  }

  if (!ctx.req.permissions.includes('read:resource')) {
    return ctx.res.forbidden({ message: 'Insufficient permissions' });
  }

  if (ctx.req.rateLimitInfo.remaining <= 0) {
    return ctx.res.status(429).withRateLimit().json({
      error: 'Rate limit exceeded',
    });
  }

  const data = getProtectedResource(ctx.req.user.id);

  return ctx.res.withTiming().withRateLimit().json({ data });
});
```

### Plugin-Based Context Extensions

Create reusable context extensions through plugins:

```typescript
// Timing plugin
const timingPlugin = defineKoriPlugin({
  name: 'timing',
  apply: (kori) =>
    kori
      .onRequest((ctx) => {
        return ctx.withReq({ startTime: Date.now() });
      })
      .onRequest((ctx) => {
        return ctx.withRes({
          withTiming: () => {
            const duration = Date.now() - ctx.req.startTime;
            return ctx.res.setHeader('x-response-time', `${duration}ms`);
          },
        });
      }),
});

// Request ID plugin
const requestIdPlugin = defineKoriPlugin({
  name: 'request-id',
  apply: (kori) =>
    kori.onRequest((ctx) => {
      const requestId = ctx.req.header('x-request-id') || crypto.randomUUID();
      return ctx.withReq({ requestId }).withRes({
        withRequestId: () => ctx.res.setHeader('x-request-id', requestId),
      });
    }),
});

// Combine plugins
app.applyPlugin(timingPlugin()).applyPlugin(requestIdPlugin());

// All handlers get timing and request ID automatically
app.get('/api/data', (ctx) => {
  const data = getData();

  return ctx.res.withTiming().withRequestId().json({ data });
});
```

### Error Handling with Context

Context is preserved in error handlers:

```typescript
app.onError((ctx, error) => {
  // Full context access in error handlers
  ctx.req.log().error('Request failed', {
    error: error.message,
    stack: error.stack,
    path: ctx.req.url().pathname,
    method: ctx.req.method(),
    user: ctx.req.user?.id,
    requestId: ctx.req.requestId,
    duration: Date.now() - ctx.req.startTime,
  });

  // Context-aware error responses
  if (!ctx.res.isReady()) {
    return ctx.res
      .withTiming()
      .withRequestId()
      .internalError({
        message: 'Internal server error',
        requestId: ctx.req.requestId,
        ...(process.env.NODE_ENV === 'development' && {
          error: error.message,
          stack: error.stack,
        }),
      });
  }
});
```

## Testing Context

Create mock contexts for unit testing:

```typescript
import { createKoriHandlerContext } from '@korix/kori';
import { mockRequest, mockResponse } from '@korix/kori/testing';

describe('User Handler', () => {
  it('should handle authenticated requests', async () => {
    const mockCtx = createKoriHandlerContext({
      env: {
        db: mockDatabase,
        config: { apiVersion: 'v1' },
      },
      req: mockRequest({
        method: 'GET',
        url: '/users/123',
        pathParams: { id: '123' },
        extensions: {
          currentUser: { id: '123', name: 'John' },
          isAuthenticated: true,
        },
      }),
      res: mockResponse(),
    });

    const result = await getUserHandler(mockCtx);

    expect(result.status).toBe(200);
    expect(result.json).toEqual({
      user: { id: '123', name: 'John' },
    });
  });

  it('should handle unauthenticated requests', async () => {
    const mockCtx = createKoriHandlerContext({
      env: { db: mockDatabase },
      req: mockRequest({
        extensions: {
          currentUser: null,
          isAuthenticated: false,
        },
      }),
      res: mockResponse(),
    });

    const result = await getUserHandler(mockCtx);

    expect(result.status).toBe(401);
  });
});
```

## Type Safety Best Practices

### 1. Explicit Extension Types

Define extension types explicitly for better IDE support:

```typescript
type AuthExtension = {
  currentUser: User | null;
  isAuthenticated: boolean;
};

type TimingExtension = {
  startTime: number;
  requestId: string;
};

type ResponseExtension = {
  withTiming(): Response;
  withAuth(): Response;
};

// Use helper types for cleaner signatures
type AuthenticatedContext<Env, Req, Res> = KoriHandlerContext<
  Env,
  Req & AuthExtension & TimingExtension,
  Res & ResponseExtension
>;
```

### 2. Conditional Type Narrowing

Use discriminated unions for conditional context:

```typescript
type DeviceContext =
  | { deviceType: 'mobile'; maxItems: 10 }
  | { deviceType: 'desktop'; maxItems: 50 };

app.onRequest((ctx): KoriHandlerContext<Env, Req & DeviceContext, Res> => {
  const userAgent = ctx.req.header('user-agent') || '';

  if (userAgent.includes('Mobile')) {
    return ctx.withReq({ deviceType: 'mobile' as const, maxItems: 10 });
  }

  return ctx.withReq({ deviceType: 'desktop' as const, maxItems: 50 });
});

app.get('/content', (ctx) => {
  // TypeScript narrows the type
  if (ctx.req.deviceType === 'mobile') {
    // ctx.req.maxItems is 10
  } else {
    // ctx.req.maxItems is 50
  }
});
```

## Performance Considerations

### 1. Minimize Extension Overhead

Keep extensions lightweight and avoid deep object copies:

```typescript
// Good: Flat, minimal extensions
app.onRequest((ctx) => {
  return ctx.withReq({
    userId: user.id,
    userRole: user.role,
    requestTime: Date.now(),
  });
});

// Avoid: Heavy nested objects
app.onRequest((ctx) => {
  return ctx.withReq({
    user: {
      /* large user object */
    },
    metadata: {
      /* complex metadata */
    },
  });
});
```

### 2. Cache Expensive Operations

Compute expensive values once in hooks, not in handlers:

```typescript
// Good: Compute once in hook
app.onRequest(async (ctx) => {
  const user = await authenticateUser(ctx.req);
  const permissions = await getUserPermissions(user);

  return ctx.withReq({ user, permissions });
});

// Avoid: Computing in every handler
app.get('/data', async (ctx) => {
  const user = await authenticateUser(ctx.req); // Repeated computation
  // ...
});
```

## Next Steps

- [Request API Reference](/en/core/request) - Complete request object documentation
- [Response API Reference](/en/core/response) - Complete response object documentation
- [Instance Context API Reference](/en/core/instance-context) - Application lifecycle context
- [Handler Context Guide](/en/guide/handler-context) - Practical usage patterns

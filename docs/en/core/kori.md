# Kori API Reference

The main Kori application class provides the core functionality for building web applications and APIs.

## Creating a Kori Application

### `createKori(options?)`

Creates a new Kori application instance.

```typescript
import { createKori } from '@korix/kori';

const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
  responseValidator: createKoriZodResponseValidator(),
  loggerFactory: pinoLoggerFactory(),
});
```

#### Options

```typescript
type CreateKoriOptions<RequestValidator, ResponseValidator> = {
  // Validation
  requestValidator?: RequestValidator;
  responseValidator?: ResponseValidator;
  onRequestValidationError?: (ctx, error) => KoriResponse;
  onResponseValidationError?: (ctx, error) => KoriResponse | void;

  // Logging
  loggerFactory?: KoriLoggerFactory;
  loggerOptions?: KoriSimpleLoggerOptions;

  // Routing
  router?: KoriRouter;
};
```

## Application Methods

### Logging

#### `app.log()`

Access the application logger.

```typescript
app.log().info('Application started');
app.log().error('Something went wrong', { error });
```

### Lifecycle Hooks

Lifecycle hooks execute once per application lifecycle.

#### `app.onInit(hook)`

Execute code when the application initializes.

```typescript
app.onInit(async (ctx) => {
  // Initialize database connection
  const db = await connectDatabase();
  return ctx.withEnv({ db });
});
```

**Type:** `(ctx: KoriInstanceContext<Env>) => Promise<KoriInstanceContext<Env & EnvExt>> | KoriInstanceContext<Env & EnvExt>`

#### `app.onClose(hook)`

Execute code when the application shuts down.

```typescript
app.onClose(async (ctx) => {
  // Clean up resources
  await ctx.env.db.close();
});
```

**Type:** `(ctx: KoriInstanceContext<Env>) => Promise<void> | void`

### Handler Hooks

Handler hooks execute for every request that matches their scope.

#### `app.onRequest(hook)`

Execute code before each request handler.

```typescript
const appWithRequestId = app.onRequest((ctx) => {
  // Add request ID
  const requestId = crypto.randomUUID();
  ctx.req.log().info('Request started', { requestId });

  return ctx.withReq({ requestId });
});
```

**Type:** `(ctx: KoriHandlerContext<Env, Req, Res>) => Promise<KoriHandlerContext<Env, Req & ReqExt, Res & ResExt>> | KoriHandlerContext<Env, Req & ReqExt, Res & ResExt>`

#### `app.onResponse(hook)`

Execute code after each request handler.

```typescript
app.onResponse((ctx) => {
  ctx.req.log().info('Request completed', {
    status: ctx.res.getStatus(),
    duration: Date.now() - ctx.req.startTime,
  });
});
```

**Type:** `(ctx: KoriHandlerContext<Env, Req, Res>) => Promise<void> | void`

#### `app.onError(hook)`

Handle errors that occur during request processing.

```typescript
app.onError((ctx, error) => {
  ctx.req.log().error('Request failed', { error: error.message });

  if (!ctx.res.isReady()) {
    return ctx.res.internalError({
      message: 'Internal server error',
      requestId: ctx.req.requestId,
    });
  }
});
```

**Type:** `(ctx: KoriHandlerContext<Env, Req, Res>, error: Error) => Promise<KoriResponse | void> | KoriResponse | void`

#### `app.onFinally(hook)`

Execute code after the request completes (success or error).

```typescript
app.onFinally((ctx) => {
  // Clean up request-scoped resources
  ctx.req.tempFiles?.forEach((file) => fs.unlink(file));
});
```

**Type:** `(ctx: KoriHandlerContext<Env, Req, Res>) => Promise<void> | void`

### Plugin System

#### `app.applyPlugin(plugin)`

Apply a plugin to extend application functionality.

```typescript
import { corsPlugin } from '@korix/cors-plugin';

app.applyPlugin(
  corsPlugin({
    origin: ['https://myapp.com'],
    credentials: true,
  }),
);
```

**Type:** `(plugin: KoriPlugin<Env, Req, Res, EnvExt, ReqExt, ResExt>) => Kori<Env & EnvExt, Req & ReqExt, Res & ResExt>`

### Child Applications

#### `app.createChild(options?)`

Create a child application with isolated configuration and optional prefix.

```typescript
// Create API routes with prefix
const apiRoutes = app.createChild({
  prefix: '/api/v1',
  configure: (k) => {
    return k.applyPlugin(authPlugin()).onRequest((ctx) => {
      ctx.req.log().info('API request');
      return ctx;
    });
  },
});

apiRoutes.get('/users', { handler: getUsersHandler });
```

#### Options

```typescript
type ChildOptions = {
  prefix?: string;
  configure?: (kori: Kori) => Kori;
};
```

## Routing Methods

### `app.addRoute(method, path, options)`

Add a route with any HTTP method.

```typescript
app.addRoute('PATCH', '/users/:id', {
  handler: (ctx) => {
    const { id } = ctx.req.pathParams();
    return ctx.res.json({ id, updated: true });
  },
});
```

### HTTP Method Aliases

Convenient methods for common HTTP verbs.

#### `app.get(path, options)`

```typescript
app.get('/users/:id', {
  handler: (ctx) => {
    const { id } = ctx.req.pathParams();
    return ctx.res.json({ userId: id });
  },
});
```

#### `app.post(path, options)`

```typescript
app.post('/users', {
  requestSchema: zodRequestSchema({
    body: UserCreateSchema,
  }),
  handler: (ctx) => {
    const userData = ctx.req.validatedBody();
    return ctx.res.status(201).json({ user: userData });
  },
});
```

#### `app.put(path, options)`

```typescript
app.put('/users/:id', {
  handler: (ctx) => {
    const { id } = ctx.req.pathParams();
    return ctx.res.json({ userId: id, updated: true });
  },
});
```

#### `app.delete(path, options)`

```typescript
app.delete('/users/:id', {
  handler: (ctx) => {
    const { id } = ctx.req.pathParams();
    return ctx.res.status(204).empty();
  },
});
```

#### `app.patch(path, options)`

```typescript
app.patch('/users/:id', {
  handler: (ctx) => {
    const { id } = ctx.req.pathParams();
    return ctx.res.json({ userId: id, patched: true });
  },
});
```

#### `app.head(path, options)`

```typescript
app.head('/users/:id', {
  handler: (ctx) => {
    const { id } = ctx.req.pathParams();
    return ctx.res.setHeader('x-user-exists', 'true').empty();
  },
});
```

#### `app.options(path, options)`

```typescript
app.options('/users', {
  handler: (ctx) => {
    return ctx.res.setHeader('allow', 'GET, POST, PUT, DELETE').empty();
  },
});
```

## Route Options

All routing methods accept an options object:

```typescript
type RouteOptions = {
  // Handler function
  handler: (ctx: KoriHandlerContext) => KoriResponse | Promise<KoriResponse>;

  // Request validation
  requestSchema?: KoriRequestSchema;

  // Response validation
  responseSchema?: KoriResponseSchema;

  // Plugin-specific metadata
  pluginMetadata?: Record<string, any>;

  // Error handling
  onRequestValidationError?: (ctx, error) => KoriResponse;
  onResponseValidationError?: (ctx, error) => KoriResponse | void;
};
```

### Example with All Options

```typescript
app.post('/users', {
  // Request validation
  requestSchema: zodRequestSchema({
    body: z.object({
      name: z.string().min(1),
      age: z.number().int().min(0),
    }),
    headers: z.object({
      'content-type': z.literal('application/json'),
    }),
  }),

  // OpenAPI metadata
  pluginMetadata: openApiMeta({
    summary: 'Create user',
    description: 'Creates a new user account',
    tags: ['Users'],
  }),

  // Custom validation error handling
  onRequestValidationError: (ctx, error) => {
    return ctx.res.badRequest({
      message: 'Validation failed',
      errors: error.details,
    });
  },

  // Main handler
  handler: async (ctx) => {
    const { name, age } = ctx.req.validatedBody();

    const user = await createUser({ name, age });

    return ctx.res.status(201).json({
      user,
      message: 'User created successfully',
    });
  },
});
```

## Type Safety

Kori provides full TypeScript support with type inference:

```typescript
// Types are automatically inferred
const app = createKori()
  .applyPlugin(corsPlugin()) // Extends response type with CORS headers
  .onRequest((ctx) => {
    const requestId = crypto.randomUUID();
    return ctx.withReq({ requestId }); // Extends request type
  });

app.get('/test', {
  handler: (ctx) => {
    // ctx.req.requestId is now available and typed
    ctx.req.log().info('Test request', {
      requestId: ctx.req.requestId,
    });

    return ctx.res.json({
      requestId: ctx.req.requestId,
    });
  },
});
```

## Advanced Patterns

### Middleware-like Plugin

```typescript
const timingPlugin = defineKoriPlugin({
  name: 'timing',
  apply: (kori) =>
    kori
      .onRequest((ctx) => {
        const startTime = Date.now();
        return ctx.withReq({ startTime });
      })
      .onResponse((ctx) => {
        const duration = Date.now() - ctx.req.startTime;
        ctx.res.setHeader('x-response-time', `${duration}ms`);
      }),
});

app.applyPlugin(timingPlugin());
```

### Modular Route Groups

```typescript
// User routes module
function createUserRoutes(app: Kori) {
  const users = app.createChild({ prefix: '/users' });

  users.get('/', { handler: listUsers });
  users.get('/:id', { handler: getUser });
  users.post('/', { handler: createUser });
  users.put('/:id', { handler: updateUser });
  users.delete('/:id', { handler: deleteUser });

  return users;
}

// Apply to main app
createUserRoutes(app);
```

### Conditional Plugin Application

```typescript
const app = createKori();

// Development-only plugins
if (process.env.NODE_ENV === 'development') {
  app.applyPlugin(corsPlugin({ origin: true }));
  app.applyPlugin(loggingPlugin({ level: 'debug' }));
}

// Production-only plugins
if (process.env.NODE_ENV === 'production') {
  app.applyPlugin(securityHeadersPlugin());
  app.applyPlugin(
    rateLimitPlugin({
      windowMs: 60000,
      maxRequests: 100,
    }),
  );
}
```

## Best Practices

### 1. Plugin Order Matters

```typescript
// Apply plugins in logical order
app
  .applyPlugin(corsPlugin()) // 1. CORS first
  .applyPlugin(bodyLimitPlugin()) // 2. Body parsing limits
  .applyPlugin(authPlugin()) // 3. Authentication
  .applyPlugin(rateLimitPlugin()) // 4. Rate limiting
  .applyPlugin(securityHeadersPlugin()); // 5. Security headers last
```

### 2. Use Type-Safe Extensions

```typescript
// Extend request type safely
const appWithAuth = app.onRequest((ctx) => {
  const user = authenticateUser(ctx.req.header('authorization'));
  return ctx.withReq({ currentUser: user });
});

// Type is automatically available in handlers
appWithAuth.get('/profile', {
  handler: (ctx) => {
    // ctx.req.currentUser is typed and available
    return ctx.res.json({ user: ctx.req.currentUser });
  },
});
```

### 3. Error Handling Strategy

```typescript
// Global error handler
app.onError((ctx, error) => {
  // Log all errors
  ctx.req.log().error('Request error', {
    error: error.message,
    stack: error.stack,
    path: ctx.req.url().pathname,
  });

  // Handle specific error types
  if (error instanceof ValidationError) {
    return ctx.res.badRequest({
      message: error.message,
      errors: error.details,
    });
  }

  if (error instanceof AuthenticationError) {
    return ctx.res.unauthorized({
      message: 'Authentication required',
    });
  }

  // Generic error response
  if (!ctx.res.isReady()) {
    return ctx.res.internalError({
      message: 'Internal server error',
    });
  }
});
```

## Next Steps

- [Context API Reference](/en/core/context) - Handler context details
- [Request API Reference](/en/core/request) - Request object methods
- [Response API Reference](/en/core/response) - Response object methods
- [Plugin Development Guide](/en/guide/plugins) - Create custom plugins

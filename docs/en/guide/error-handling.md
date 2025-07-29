# Error Handling

Kori provides comprehensive error handling with **built-in error responses**, **automatic content negotiation**, and **flexible error recovery patterns**.

## Built-in Error Responses

Kori includes ready-to-use error response methods that automatically format based on the client's `Accept` header:

```typescript
app.get('/users/:id', {
  handler: async (ctx) => {
    const { id } = ctx.req.pathParams();

    // Validate input
    if (!id || isNaN(Number(id))) {
      return ctx.res.badRequest({
        message: 'Invalid user ID',
        code: 'INVALID_ID',
      });
    }

    const user = await getUser(Number(id));

    if (!user) {
      return ctx.res.notFound({
        message: `User with ID ${id} not found`,
        code: 'USER_NOT_FOUND',
      });
    }

    return ctx.res.json({ user });
  },
});
```

### Available Error Methods

```typescript
// 400 Bad Request
ctx.res.badRequest({ message: 'Invalid input data' });

// 401 Unauthorized
ctx.res.unauthorized({ message: 'Authentication required' });

// 403 Forbidden
ctx.res.forbidden({ message: 'Insufficient permissions' });

// 404 Not Found
ctx.res.notFound({ message: 'Resource not found' });

// 405 Method Not Allowed
ctx.res.methodNotAllowed({ message: 'Only GET and POST allowed' });

// 500 Internal Server Error
ctx.res.internalError({ message: 'Something went wrong' });
```

### Automatic Content Negotiation

Responses format automatically based on the client's `Accept` header:

**JSON (default):**

```json
{
  "error": "Not Found",
  "message": "User with ID 123 not found",
  "code": "USER_NOT_FOUND",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**HTML:**

```html
<!DOCTYPE html>
<html>
  <head>
    <title>404 Not Found</title>
  </head>
  <body>
    <h1>Not Found</h1>
    <p>User with ID 123 not found</p>
  </body>
</html>
```

## Global Error Handling

Set up application-wide error handling with the `onError` hook:

```typescript
const app = createKori();

app.onError((ctx, error) => {
  // Log the error
  ctx.req.log().error('Request failed', {
    error: error.message,
    stack: error.stack,
    url: ctx.req.url().pathname,
  });

  // Return appropriate response
  if (!ctx.res.isReady()) {
    ctx.res.internalError({ message: 'Internal Server Error' });
  }
});
```

### Error Recovery Patterns

```typescript
app.get('/api/data', {
  handler: async (ctx) => {
    try {
      const data = await fetchExternalAPI();
      return ctx.res.json(data);
    } catch (error) {
      if (error.code === 'NETWORK_ERROR') {
        return ctx.res.badRequest({
          message: 'External service unavailable',
          code: 'SERVICE_UNAVAILABLE',
        });
      }

      // Re-throw for global handler
      throw error;
    }
  },
});
```

## Custom Errors

Create custom error classes for better error handling:

```typescript
class AuthenticationError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Use in handlers
app.get('/protected', {
  handler: async (ctx) => {
    const token = ctx.req.header('authorization');

    if (!token) {
      throw new AuthenticationError();
    }

    if (!isValidToken(token)) {
      throw new AuthenticationError('Invalid token');
    }

    return ctx.res.json({ data: 'protected data' });
  },
});

// Handle in global error handler
app.onError((ctx, error) => {
  if (error instanceof AuthenticationError) {
    return ctx.res.unauthorized({ message: error.message });
  }

  if (error instanceof ValidationError) {
    return ctx.res.badRequest({
      message: error.message,
      field: error.field,
    });
  }

  ctx.req.log().error('Unhandled error', { error });
  if (!ctx.res.isReady()) {
    ctx.res.internalError({ message: 'Internal Server Error' });
  }
});
```

## Validation Errors

Handle validation errors with custom formatting:

```typescript
const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
  onRequestValidationError: (ctx, error) => {
    return ctx.res.badRequest({
      message: 'Validation failed',
      errors: error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code,
      })),
    });
  },
});
```

## Error Response Patterns

### API Error Format

Consistent error format for APIs:

```typescript
function createApiError(status: number, message: string, code?: string, details?: any) {
  return {
    error: true,
    status,
    message,
    code,
    details,
    timestamp: new Date().toISOString(),
  };
}

app.get('/api/users/:id', {
  handler: async (ctx) => {
    const user = await getUser(ctx.req.pathParams().id);

    if (!user) {
      return ctx.res.status(404).json(
        createApiError(404, 'User not found', 'USER_NOT_FOUND', {
          userId: ctx.req.pathParams().id,
        }),
      );
    }

    return ctx.res.json({ user });
  },
});
```

### Graceful Degradation

Handle service failures gracefully:

```typescript
app.get('/dashboard', {
  handler: async (ctx) => {
    try {
      const [user, notifications, stats] = await Promise.allSettled([getUserData(), getNotifications(), getStats()]);

      return ctx.res.json({
        user: user.status === 'fulfilled' ? user.value : null,
        notifications: notifications.status === 'fulfilled' ? notifications.value : [],
        stats: stats.status === 'fulfilled' ? stats.value : { error: 'Stats unavailable' },
      });
    } catch (error) {
      return ctx.res.internalError({ message: 'Dashboard data unavailable' });
    }
  },
});
```

## Debugging Tips

### Error Logging

Enhanced error logging for debugging:

```typescript
app.onError((ctx, error) => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    method: ctx.req.method(),
    url: ctx.req.url().href,
    headers: ctx.req.headers(),
    userAgent: ctx.req.header('user-agent'),
    timestamp: new Date().toISOString(),
  };

  if (error.name === 'ValidationError') {
    ctx.req.log().warn('Validation error', errorInfo);
  } else {
    ctx.req.log().error('Unhandled error', errorInfo);
  }

  if (!ctx.res.isReady()) {
    ctx.res.internalError({ message: 'Internal Server Error' });
  }
});
```

### Development vs Production

Different error handling for development and production:

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

app.onError((ctx, error) => {
  ctx.req.log().error('Error occurred', { error: error.message });

  if (!ctx.res.isReady()) {
    ctx.res.internalError({
      message: isDevelopment ? error.message : 'Internal Server Error',
      ...(isDevelopment && { stack: error.stack }),
    });
  }
});
```

### Error Testing

Test your error handling:

```typescript
// Test error responses
const response = await app.handle(new Request('http://localhost/users/invalid-id'));

expect(response.status).toBe(400);
const error = await response.json();
expect(error.code).toBe('INVALID_ID');
```

## Next Steps

- **[Validation Guide](/en/guide/validation)** - Handle validation errors elegantly
- **[Hooks Guide](/en/guide/hooks)** - Add error handling middleware
- **[Examples](/en/examples/)** - See error handling in real applications
- **[Response API Reference](/en/core/response)** - Complete error response methods

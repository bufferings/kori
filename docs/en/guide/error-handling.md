# Error Handling

Kori provides comprehensive error handling with built-in error responses, automatic content negotiation, and flexible error recovery patterns.

## Built-in Error Responses

Kori includes ready-to-use error response methods that automatically format based on the client's `Accept` header:

```typescript
app.get('/users/:id', async (ctx) => {
  const { id } = ctx.req.pathParams();

  const user = await getUser(Number(id));

  if (!user) {
    return ctx.res.notFound({
      message: `User with ID ${id} not found`,
      code: 'USER_NOT_FOUND',
    });
  }

  return ctx.res.json({ user });
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

JSON (default):

```json
{
  "error": "Not Found",
  "message": "User with ID 123 not found",
  "code": "USER_NOT_FOUND",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

HTML:

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
const app = createKori().onError((ctx, error) => {
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

Handle specific errors locally and let the global handler manage unexpected ones:

```typescript
app.get('/api/data', async (ctx) => {
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
});
```

# Error Handling

Kori provides comprehensive error handling with built-in error responses and flexible error recovery patterns.

## Built-in Error Responses

Kori includes ready-to-use error response methods that set the appropriate HTTP status code and return a JSON body:

```typescript
app.get('/users/:id', async (ctx) => {
  const id = ctx.req.param('id');

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
ctx.res.badRequest();

// 401 Unauthorized
ctx.res.unauthorized();

// 403 Forbidden
ctx.res.forbidden();

// 404 Not Found
ctx.res.notFound();

// 405 Method Not Allowed
ctx.res.methodNotAllowed();

// 415 Unsupported Media Type
ctx.res.unsupportedMediaType();

// 408 Request Timeout
ctx.res.timeout();

// 500 Internal Server Error
ctx.res.internalError();
```

### Error Response Format

All error responses return JSON format with a consistent structure.

#### Default Responses

Without custom options, each method returns a standard message:

```typescript
// Default usage
ctx.res.notFound();
```

```json
{
  "error": {
    "type": "NOT_FOUND",
    "message": "Not Found"
  }
}
```

#### Custom Responses

You can include additional fields in the error response:

```typescript
// Custom usage
ctx.res.notFound({
  message: 'User with ID 123 not found',
  code: 'USER_NOT_FOUND',
  details: { userId: 123, searchedAt: new Date().toISOString() },
});
```

```json
{
  "error": {
    "type": "NOT_FOUND",
    "message": "User with ID 123 not found",
    "code": "USER_NOT_FOUND",
    "details": {
      "userId": 123,
      "searchedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

## Global Error Handling

Set up application-wide error handling with the `onError` hook:

```typescript
const app = createKori().onError((ctx, error) => {
  // Log the error
  ctx.log().error('Request failed', {
    error: error.message,
    stack: error.stack,
    url: ctx.req.url().pathname,
  });

  // Return appropriate response
  return ctx.res.internalError({ message: 'Internal Server Error' });
});
```

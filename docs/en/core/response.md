# Response API Reference

The `KoriResponse` object (accessed as `ctx.res`) provides methods for building HTTP responses with a fluent, chainable API.

## Type Definition

```typescript
type KoriResponse = {
  // Status
  status(statusCode: HttpStatusCode): KoriResponse;

  // Headers
  setHeader(name: HttpResponseHeaderName, value: string): KoriResponse;
  appendHeader(name: HttpResponseHeaderName, value: string): KoriResponse;
  removeHeader(name: HttpResponseHeaderName): KoriResponse;

  // Cookies
  setCookie(
    name: string,
    value: CookieValue,
    options?: CookieOptions,
  ): KoriResponse;
  clearCookie(
    name: string,
    options?: Pick<CookieOptions, 'path' | 'domain'>,
  ): KoriResponse;

  // Body Content
  json<T>(body: T): KoriResponse;
  text(body: string): KoriResponse;
  html(body: string): KoriResponse;
  empty(): KoriResponse;
  stream(body: ReadableStream): KoriResponse;

  // Error Responses
  badRequest(options?: ErrorResponseOptions): KoriResponse;
  unauthorized(options?: ErrorResponseOptions): KoriResponse;
  forbidden(options?: ErrorResponseOptions): KoriResponse;
  notFound(options?: ErrorResponseOptions): KoriResponse;
  methodNotAllowed(options?: ErrorResponseOptions): KoriResponse;
  unsupportedMediaType(options?: ErrorResponseOptions): KoriResponse;
  timeout(options?: ErrorResponseOptions): KoriResponse;
  internalError(options?: ErrorResponseOptions): KoriResponse;

  // Inspection
  getStatus(): HttpStatusCode;
  getHeadersCopy(): Headers;
  getHeader(name: HttpResponseHeaderName): string | undefined;
  getContentType(): string | undefined;
  getBody(): unknown;
  isReady(): boolean;
  isStream(): boolean;

  // Build
  build(): Response;
};
```

## Fluent API Design

All response methods return the response instance for method chaining:

```typescript
app.get('/example', {
  handler: (ctx) => {
    return ctx.res
      .status(201)
      .setHeader('x-custom-header', 'value')
      .setCookie('sessionId', 'abc123', { httpOnly: true })
      .json({
        message: 'Created successfully',
        timestamp: new Date().toISOString(),
      });
  },
});
```

## Status Methods

### `res.status(statusCode)`

Set the HTTP status code.

```typescript
app.post('/users', {
  handler: async (ctx) => {
    const user = await createUser(ctx.req.validatedBody());

    return ctx.res
      .status(201) // Created
      .json({ user });
  },
});

app.delete('/users/:id', {
  handler: async (ctx) => {
    await deleteUser(ctx.req.pathParams().id);

    return ctx.res
      .status(204) // No Content
      .empty();
  },
});
```

**Common status codes:**

- `200` - OK
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

### `res.getStatus()`

Get the current status code.

```typescript
app.get('/debug', {
  handler: (ctx) => {
    ctx.res.status(200);

    const currentStatus = ctx.res.getStatus(); // 200

    return ctx.res.json({ status: currentStatus });
  },
});
```

## Header Methods

### `res.setHeader(name, value)`

Set a response header. Overwrites existing headers with the same name.

```typescript
app.get('/download', {
  handler: (ctx) => {
    return ctx.res
      .setHeader('content-disposition', 'attachment; filename="data.csv"')
      .setHeader('cache-control', 'no-cache')
      .text('id,name,age\n1,John,30');
  },
});
```

### `res.appendHeader(name, value)`

Append to an existing header or create a new one.

```typescript
app.get('/multi-headers', {
  handler: (ctx) => {
    return ctx.res
      .setHeader('x-custom', 'first')
      .appendHeader('x-custom', 'second') // x-custom: first, second
      .json({ message: 'Multiple header values' });
  },
});
```

### `res.removeHeader(name)`

Remove a header.

```typescript
app.get('/remove-header', {
  handler: (ctx) => {
    return ctx.res
      .setHeader('x-debug', 'temporary')
      .removeHeader('x-debug') // Header removed
      .json({ message: 'Header removed' });
  },
});
```

### `res.getHeader(name)`

Get a specific header value.

```typescript
app.get('/check-header', {
  handler: (ctx) => {
    ctx.res.setHeader('x-request-id', 'abc123');

    const requestId = ctx.res.getHeader('x-request-id'); // 'abc123'

    return ctx.res.json({ requestId });
  },
});
```

### `res.getHeadersCopy()`

Get a copy of all headers.

```typescript
app.get('/all-headers', {
  handler: (ctx) => {
    ctx.res
      .setHeader('x-version', '1.0')
      .setHeader('x-environment', 'development');

    const headers = ctx.res.getHeadersCopy();
    const headersObject = Object.fromEntries(headers.entries());

    return ctx.res.json({ headers: headersObject });
  },
});
```

## Cookie Methods

### `res.setCookie(name, value, options?)`

Set a cookie with optional configuration.

```typescript
app.post('/login', {
  handler: async (ctx) => {
    const user = await authenticateUser(ctx.req.validatedBody());
    const sessionToken = generateSessionToken(user);

    return ctx.res
      .setCookie('sessionId', sessionToken, {
        httpOnly: true, // Prevent XSS
        secure: true, // HTTPS only
        sameSite: 'strict', // CSRF protection
        maxAge: 86400, // 24 hours
        path: '/',
      })
      .setCookie('theme', 'dark', {
        maxAge: 2592000, // 30 days
        sameSite: 'lax',
      })
      .json({ user, message: 'Login successful' });
  },
});
```

**Cookie options:**

```typescript
type CookieOptions = {
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  maxAge?: number;
  expires?: Date;
  sameSite?: 'Strict' | 'Lax' | 'None' | 'strict' | 'lax' | 'none';
  partitioned?: boolean;
};
```

### Cookie constraints

Kori validates cookie options to prevent invalid Set-Cookie headers.

- SameSite=None requires Secure
  - If sameSite is set to None, secure must be true
  - Comparison is case-insensitive; the output is canonicalized to `SameSite=None`
- Partitioned requires Secure and SameSite=None
  - If partitioned is true, both secure must be true and sameSite must be None

Example:

```typescript
ctx.res.setCookie('id', 'abc', {
  secure: true,
  sameSite: 'None',
  partitioned: true,
  path: '/',
});
```

### Cookie errors

Kori validates cookie options and throws a typed `KoriCookieError` when they are invalid.

Common error types include:

- INVALID_NAME: Cookie name is empty or not RFC 6265 compliant
- PREFIX_VIOLATION: Violates `__Secure-` or `__Host-` prefix requirements
- AGE_LIMIT_EXCEEDED / EXPIRES_LIMIT_EXCEEDED: Exceeds 400-day limits
- SAMESITE_NONE_REQUIRES_SECURE: `SameSite=None` must have `secure: true`
- PARTITIONED_REQUIRES_SECURE: `partitioned: true` requires `secure: true`
- PARTITIONED_REQUIRES_SAMESITE_NONE: `partitioned: true` requires `SameSite=None`

```typescript
app.post('/cookie', {
  handler: (ctx) => {
    try {
      ctx.res.setCookie('id', 'v', {
        secure: true,
        sameSite: 'None',
        partitioned: true,
      });
      return ctx.res.json({ ok: true });
    } catch (e) {
      // e is KoriCookieError
      return ctx.res.badRequest({ message: 'Invalid cookie options' });
    }
  },
});
```

### `res.clearCookie(name, options?)`

Clear/delete a cookie.

```typescript
app.post('/logout', {
  handler: (ctx) => {
    return ctx.res
      .clearCookie('sessionId', { path: '/' })
      .clearCookie('theme', { path: '/' })
      .json({ message: 'Logged out successfully' });
  },
});
```

## Content Methods

### `res.json(body)`

Send a JSON response with automatic Content-Type header.

```typescript
app.get('/users/:id', {
  handler: async (ctx) => {
    const { id } = ctx.req.pathParams();
    const user = await getUser(id);

    if (!user) {
      return ctx.res.notFound({ message: 'User not found' });
    }

    return ctx.res.json({
      user,
      timestamp: new Date().toISOString(),
      version: '1.0',
    });
  },
});
```

**Automatic features:**

- Sets `Content-Type: application/json; charset=utf-8`
- Serializes JavaScript objects/arrays to JSON
- Handles dates, null, undefined appropriately

### `res.text(body)`

Send a plain text response.

```typescript
app.get('/health', {
  handler: (ctx) => {
    return ctx.res.text('OK');
  },
});

app.get('/csv', {
  handler: async (ctx) => {
    const users = await getUsers();
    const csv = generateCSV(users);

    return ctx.res
      .setHeader('content-disposition', 'attachment; filename="users.csv"')
      .text(csv);
  },
});
```

**Sets:** `Content-Type: text/plain; charset=utf-8`

### `res.html(body)`

Send an HTML response.

```typescript
app.get('/welcome', {
  handler: (ctx) => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Welcome</title>
          <meta charset="utf-8">
        </head>
        <body>
          <h1>Welcome to Kori!</h1>
          <p>The modern TypeScript web framework.</p>
        </body>
      </html>
    `;

    return ctx.res.html(html);
  },
});
```

**Sets:** `Content-Type: text/html; charset=utf-8`

### `res.empty()`

Send an empty response (no body).

```typescript
app.delete('/users/:id', {
  handler: async (ctx) => {
    const { id } = ctx.req.pathParams();
    await deleteUser(id);

    return ctx.res
      .status(204) // No Content
      .empty();
  },
});

app.options('/users', {
  handler: (ctx) => {
    return ctx.res.setHeader('allow', 'GET, POST, PUT, DELETE').empty();
  },
});
```

### `res.stream(body)`

Send a streaming response.

```typescript
app.get('/large-file', {
  handler: async (ctx) => {
    const fileStream = createReadStream('/path/to/large-file.zip');

    return ctx.res
      .setHeader('content-type', 'application/zip')
      .setHeader('content-disposition', 'attachment; filename="archive.zip"')
      .stream(fileStream);
  },
});

app.get('/events', {
  handler: (ctx) => {
    const stream = new ReadableStream({
      start(controller) {
        // Server-Sent Events
        const sendEvent = (data: any) => {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
        };

        sendEvent({ message: 'Connected' });

        const interval = setInterval(() => {
          sendEvent({ timestamp: Date.now() });
        }, 1000);

        // Cleanup on close
        ctx.req.raw().signal.addEventListener('abort', () => {
          clearInterval(interval);
          controller.close();
        });
      },
    });

    return ctx.res
      .setHeader('content-type', 'text/event-stream')
      .setHeader('cache-control', 'no-cache')
      .setHeader('connection', 'keep-alive')
      .stream(stream);
  },
});
```

## Error Response Methods

Error methods always return JSON responses.

### `res.badRequest(options?)`

Send a 400 Bad Request response.

```typescript
app.post('/users', {
  handler: async (ctx) => {
    const userData = ctx.req.validatedBody();

    if (userData.age < 0) {
      return ctx.res.badRequest({
        message: 'User age must be non-negative',
        code: 'INVALID_AGE',
      });
    }

    const user = await createUser(userData);
    return ctx.res.status(201).json({ user });
  },
});
```

### `res.unauthorized(options?)`

Send a 401 Unauthorized response.

```typescript
app.get('/profile', {
  handler: (ctx) => {
    const token = ctx.req.header('authorization');

    if (!token) {
      return ctx.res.unauthorized({
        message: 'Authorization header required',
        code: 'NO_TOKEN',
      });
    }

    const user = verifyToken(token);
    if (!user) {
      return ctx.res.unauthorized({
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      });
    }

    return ctx.res.json({ user });
  },
});
```

### `res.forbidden(options?)`

Send a 403 Forbidden response.

```typescript
app.delete('/admin/users/:id', {
  handler: (ctx) => {
    const currentUser = ctx.req.user;

    if (!currentUser.isAdmin) {
      return ctx.res.forbidden({
        message: 'Admin privileges required',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    // Admin logic here
    return ctx.res.json({ message: 'User deleted' });
  },
});
```

### `res.notFound(options?)`

Send a 404 Not Found response.

```typescript
app.get('/users/:id', {
  handler: async (ctx) => {
    const { id } = ctx.req.pathParams();
    const user = await getUser(id);

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

### `res.methodNotAllowed(options?)`

Send a 405 Method Not Allowed response.

```typescript
app.addRoute(['GET', 'POST'], '/flexible', {
  handler: (ctx) => {
    const method = ctx.req.method();

    if (method === 'GET') {
      return ctx.res.json({ data: 'read' });
    } else if (method === 'POST') {
      return ctx.res.json({ data: 'write' });
    } else {
      return ctx.res.methodNotAllowed({
        message: 'Only GET and POST are allowed',
      });
    }
  },
});
```

### `res.unsupportedMediaType(options?)`

Send a 415 Unsupported Media Type response.

```typescript
app.post('/upload', {
  handler: (ctx) => {
    const contentType = ctx.req.contentType();

    if (!['image/jpeg', 'image/png', 'image/gif'].includes(contentType)) {
      return ctx.res.unsupportedMediaType({
        message: 'Only JPEG, PNG, and GIF images are supported',
        supportedTypes: ['image/jpeg', 'image/png', 'image/gif'],
      });
    }

    // Process upload
    return ctx.res.json({ uploaded: true });
  },
});
```

### `res.timeout(options?)`

Send a 408 Request Timeout response.

```typescript
app.post('/process', {
  handler: async (ctx) => {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 5000),
    );

    try {
      const result = await Promise.race([
        processLongTask(ctx.req.validatedBody()),
        timeout,
      ]);

      return ctx.res.json({ result });
    } catch (error) {
      if (error.message === 'timeout') {
        return ctx.res.timeout({
          message: 'Request processing timed out',
          timeout: 5000,
        });
      }
      throw error;
    }
  },
});
```

### `res.internalError(options?)`

Send a 500 Internal Server Error response.

```typescript
app.get('/risky', {
  handler: async (ctx) => {
    try {
      const data = await riskyOperation();
      return ctx.res.json({ data });
    } catch (error) {
      ctx.req.log().error('Operation failed', { error: error.message });

      return ctx.res.internalError({
        message: 'An unexpected error occurred',
        requestId: ctx.req.requestId,
      });
    }
  },
});
```

## Error Response Options

```typescript
type ErrorResponseOptions = {
  message?: string;
  code?: string;
  details?: unknown;
  [key: string]: unknown; // Additional fields
};
```

### Error Response Format

Error responses always return JSON format:

```typescript
// All error responses return JSON
{
  "error": {
    "type": "BAD_REQUEST",
    "message": "Invalid input data",
    "code": "VALIDATION_ERROR",
    "details": {...}
  }
}
```

You can include additional fields in the error response:

```typescript
app.post('/api/data', {
  handler: (ctx) => {
    return ctx.res.badRequest({
      message: 'Invalid data format',
      code: 'VALIDATION_ERROR',
      details: { field: 'email', reason: 'invalid format' },
    });
  },
});
```

## Inspection Methods

### `res.getContentType()`

Get the current Content-Type header.

```typescript
app.get('/debug', {
  handler: (ctx) => {
    ctx.res.json({ test: true });

    const contentType = ctx.res.getContentType();
    // 'application/json; charset=utf-8'

    return ctx.res.json({ contentType });
  },
});
```

### `res.getBody()`

Get the current response body.

```typescript
app.get('/debug-body', {
  handler: (ctx) => {
    const responseData = { message: 'Hello' };
    ctx.res.json(responseData);

    const body = ctx.res.getBody(); // { message: 'Hello' }

    return ctx.res.json({ originalBody: body });
  },
});
```

### `res.isReady()`

Check if response is ready to be sent.

```typescript
app.get('/check-ready', {
  handler: (ctx) => {
    const readyBefore = ctx.res.isReady(); // false

    ctx.res.json({ message: 'Hello' });

    const readyAfter = ctx.res.isReady(); // true

    return ctx.res.json({ readyBefore, readyAfter });
  },
});
```

### `res.isStream()`

Check if response body is a stream.

```typescript
app.get('/check-stream', {
  handler: (ctx) => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue('data');
        controller.close();
      },
    });

    ctx.res.stream(stream);

    const isStreaming = ctx.res.isStream(); // true

    return ctx.res.json({ isStreaming });
  },
});
```

## Advanced Patterns

### Conditional Responses

```typescript
app.get('/data', {
  handler: async (ctx) => {
    const format = ctx.req.queryParams().format;
    const data = await getData();

    switch (format) {
      case 'csv':
        return ctx.res
          .setHeader('content-type', 'text/csv')
          .setHeader('content-disposition', 'attachment; filename="data.csv"')
          .text(convertToCSV(data));

      case 'xml':
        return ctx.res
          .setHeader('content-type', 'application/xml')
          .text(convertToXML(data));

      default:
        return ctx.res.json(data);
    }
  },
});
```

### Response Middleware

```typescript
app.onResponse((ctx) => {
  // Add security headers to all responses
  ctx.res
    .setHeader('x-content-type-options', 'nosniff')
    .setHeader('x-frame-options', 'DENY')
    .setHeader('x-xss-protection', '1; mode=block');

  // Add timing header
  const duration = Date.now() - ctx.req.startTime;
  ctx.res.setHeader('x-response-time', `${duration}ms`);
});
```

### Error Response Consistency

```typescript
// Global error handler
app.onError((ctx, error) => {
  ctx.req.log().error('Request failed', {
    error: error.message,
    stack: error.stack,
    path: ctx.req.url().pathname,
  });

  if (!ctx.res.isReady()) {
    return ctx.res.internalError({
      message: 'Internal server error',
      requestId: ctx.req.requestId,
      timestamp: new Date().toISOString(),
    });
  }
});
```

### Caching Headers

```typescript
app.get('/static-data', {
  handler: async (ctx) => {
    const data = await getCachedData();
    const etag = generateETag(data);

    const clientETag = ctx.req.header('if-none-match');
    if (clientETag === etag) {
      return ctx.res
        .status(304) // Not Modified
        .empty();
    }

    return ctx.res
      .setHeader('etag', etag)
      .setHeader('cache-control', 'public, max-age=3600')
      .json(data);
  },
});
```

### File Downloads

```typescript
app.get('/download/:filename', {
  handler: async (ctx) => {
    const { filename } = ctx.req.pathParams();

    const filePath = await resolveSecureFilePath(filename);
    if (!filePath) {
      return ctx.res.notFound({ message: 'File not found' });
    }

    const stats = await fs.stat(filePath);
    const stream = fs.createReadStream(filePath);

    return ctx.res
      .setHeader('content-length', stats.size.toString())
      .setHeader('content-type', 'application/octet-stream')
      .setHeader('content-disposition', `attachment; filename="${filename}"`)
      .stream(stream);
  },
});
```

## Performance Tips

### 1. Chain Methods Efficiently

```typescript
// Good: Single chain
return ctx.res
  .status(201)
  .setHeader('location', `/users/${user.id}`)
  .setCookie('lastCreated', user.id)
  .json({ user });

// Avoid: Multiple separate calls
ctx.res.status(201);
ctx.res.setHeader('location', `/users/${user.id}`);
ctx.res.setCookie('lastCreated', user.id);
return ctx.res.json({ user });
```

### 2. Use Appropriate Content Types

```typescript
// Good: Specific content types
app.get('/health', {
  handler: (ctx) => ctx.res.text('OK'), // Simple text
});

app.get('/users', {
  handler: (ctx) => ctx.res.json(users), // Structured data
});

// Avoid: JSON for simple responses
app.get('/health', {
  handler: (ctx) => ctx.res.json({ status: 'OK' }), // Unnecessary overhead
});
```

### 3. Stream Large Responses

```typescript
// Good: Stream large data
app.get('/export', {
  handler: async (ctx) => {
    const dataStream = createLargeDataStream();
    return ctx.res.stream(dataStream);
  },
});

// Avoid: Loading large data into memory
app.get('/export', {
  handler: async (ctx) => {
    const largeData = await loadAllDataIntoMemory(); // Memory intensive
    return ctx.res.json(largeData);
  },
});
```

## Next Steps

- [Context API Reference](/en/core/context) - Handler context documentation
- [Request API Reference](/en/core/request) - Request object methods
- [Error Handling Guide](/en/guide/error-handling) - Advanced error patterns
- [Hooks Guide](/en/guide/hooks) - Response processing lifecycle

# Request & Response

Kori provides a powerful and type-safe API for handling HTTP requests and responses. This guide covers how to work with the `ctx.req` and `ctx.res` objects that your handlers receive.

## Handler Context

Every Kori handler receives a single `ctx` parameter that contains:

```typescript
export type KoriHandlerContext = {
  env: KoriEnvironment; // Environment data
  req: KoriRequest; // Request object
  res: KoriResponse; // Response object
  withReq<ReqExt>(reqExt: ReqExt): KoriHandlerContext;
  withRes<ResExt>(resExt: ResExt): KoriHandlerContext;
};
```

Basic handler structure:

```typescript
app.get('/example', {
  handler: (ctx) => {
    // ctx.env - environment data
    // ctx.req - request methods and data
    // ctx.res - response building methods
    return ctx.res.json({ message: 'Hello!' });
  },
});
```

## Request Object (`ctx.req`)

The request object provides access to all incoming request data with caching for performance.

### URL and Routing

```typescript
app.get('/users/:id/posts/:postId', {
  handler: (ctx) => {
    // Get the full URL object
    const url = ctx.req.url();
    console.log(url.pathname); // "/users/123/posts/456"
    console.log(url.hostname); // "localhost"

    // Get HTTP method
    const method = ctx.req.method(); // "GET"

    // Access path parameters (object, not function!)
    const { id, postId } = ctx.req.pathParams;

    // Query parameters (function that returns object)
    const queries = ctx.req.queryParams();
    console.log(queries); // { search: "javascript", limit: "10" }

    return ctx.res.json({ userId: id, postId, queries });
  },
});
```

### Headers

```typescript
app.post('/upload', {
  handler: (ctx) => {
    // Get all headers as object (cached)
    const headers = ctx.req.headers();

    // Get specific header
    const contentType = ctx.req.header('content-type');
    const authorization = ctx.req.header('authorization');

    // Get full content type header
    const fullContentType = ctx.req.fullContentType(); // "application/json; charset=utf-8"

    // Get parsed content type (just the type)
    const parsedType = ctx.req.contentType(); // "application/json"

    return ctx.res.json({ contentType, authorization });
  },
});
```

### Cookies

```typescript
app.get('/profile', {
  handler: (ctx) => {
    // Get all cookies as object
    const cookies = ctx.req.cookies();

    // Get specific cookie
    const sessionId = ctx.req.cookie('session_id');
    const theme = ctx.req.cookie('theme') ?? 'light';

    return ctx.res.json({ sessionId, theme, allCookies: cookies });
  },
});
```

### Request Body

Kori provides multiple ways to access request body data, all with automatic caching:

```typescript
app.post('/data', {
  handler: async (ctx) => {
    // JSON body (most common)
    const jsonData = await ctx.req.bodyJson();

    // Text body
    const textData = await ctx.req.bodyText();

    // Form data
    const formData = await ctx.req.bodyFormData();

    // Array buffer (for binary data)
    const buffer = await ctx.req.bodyArrayBuffer();

    // Stream (for large files)
    const stream = ctx.req.bodyStream();

    // Auto-parse based on Content-Type
    const parsed = await ctx.req.parseBody();
    // - application/json → JSON
    // - application/x-www-form-urlencoded → FormData
    // - multipart/form-data → FormData
    // - application/octet-stream → ArrayBuffer
    // - default → JSON
    // - others → text

    return ctx.res.json({ received: parsed });
  },
});
```

### Raw Request Access

```typescript
app.post('/proxy', {
  handler: (ctx) => {
    // Access underlying Request object
    const rawRequest = ctx.req.raw();

    // Forward to another service
    const response = await fetch('https://api.example.com/webhook', {
      method: rawRequest.method,
      headers: rawRequest.headers,
      body: rawRequest.body,
    });

    return ctx.res.json({ proxied: true });
  },
});
```

### Logging

```typescript
app.get('/debug', {
  handler: (ctx) => {
    // Request-scoped logger
    const logger = ctx.req.log();
    logger.info('Processing request', { path: ctx.req.url().pathname });

    return ctx.res.json({ logged: true });
  },
});
```

## Response Object (`ctx.res`)

The response object provides a fluent API for building HTTP responses.

### JSON Responses

```typescript
app.get('/api/users', {
  handler: (ctx) => {
    const users = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ];

    // Simple JSON response
    return ctx.res.json(users);

    // With status code
    return ctx.res.status(HttpStatus.OK).json(users);
  },
});
```

### Text and HTML

```typescript
app.get('/plain', {
  handler: (ctx) => {
    return ctx.res.text('Hello, World!');
  },
});

app.get('/page', {
  handler: (ctx) => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Kori App</title></head>
        <body><h1>Welcome!</h1></body>
      </html>
    `;
    return ctx.res.html(html);
  },
});
```

### Status Codes

```typescript
import { HttpStatus } from '@korix/kori';

app.post('/users', {
  handler: (ctx) => {
    // Method chaining
    return ctx.res.status(HttpStatus.CREATED).json({ id: 123, message: 'User created' });
  },
});

app.delete('/users/:id', {
  handler: (ctx) => {
    // Empty response with status
    return ctx.res.status(HttpStatus.NO_CONTENT).empty();
  },
});
```

### Headers

```typescript
app.get('/download', {
  handler: (ctx) => {
    const csvData = 'name,email\nAlice,alice@example.com';

    return ctx.res
      .setHeader('content-type', 'text/csv')
      .setHeader('content-disposition', 'attachment; filename="users.csv"')
      .setHeader('cache-control', 'no-cache')
      .text(csvData);
  },
});

app.get('/api/data', {
  handler: (ctx) => {
    return ctx.res
      .appendHeader('x-custom-header', 'value1')
      .appendHeader('x-custom-header', 'value2') // Multiple values
      .json({ data: 'example' });
  },
});
```

### Cookies

```typescript
app.post('/login', {
  handler: (ctx) => {
    const sessionId = 'session_' + Date.now();

    return ctx.res
      .setCookie('session_id', sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 86400, // 24 hours
        path: '/',
      })
      .setCookie('theme', 'dark')
      .json({ message: 'Logged in', sessionId });
  },
});

app.post('/logout', {
  handler: (ctx) => {
    return ctx.res.clearCookie('session_id').clearCookie('theme').json({ message: 'Logged out' });
  },
});
```

### Error Responses

Kori provides convenient error response methods with automatic content negotiation:

```typescript
app.get('/protected', {
  handler: (ctx) => {
    const token = ctx.req.header('authorization');

    if (!token) {
      // Automatic content negotiation based on Accept header
      return ctx.res.unauthorized({
        message: 'Authentication required',
      });
    }

    return ctx.res.json({ data: 'protected content' });
  },
});

app.get('/users/:id', {
  handler: async (ctx) => {
    const { id } = ctx.req.pathParams;
    const user = await findUser(id);

    if (!user) {
      return ctx.res.notFound({
        message: `User ${id} not found`,
      });
    }

    return ctx.res.json(user);
  },
});
```

Available error methods:

- `badRequest(options)` - 400
- `unauthorized(options)` - 401
- `forbidden(options)` - 403
- `notFound(options)` - 404
- `methodNotAllowed(options)` - 405
- `unsupportedMediaType(options)` - 415
- `timeout(options)` - 408
- `internalError(options)` - 500

### Streaming Responses

```typescript
app.get('/stream', {
  handler: (ctx) => {
    const stream = new ReadableStream({
      start(controller) {
        let count = 0;
        const timer = setInterval(() => {
          controller.enqueue(`data: ${JSON.stringify({ count: count++ })}\n\n`);
          if (count >= 10) {
            controller.close();
            clearInterval(timer);
          }
        }, 1000);
      },
    });

    return ctx.res.setHeader('content-type', 'text/plain').setHeader('cache-control', 'no-cache').stream(stream);
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

const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  tags: z.array(z.string()).max(10),
});

app.post('/posts', {
  requestSchema: zodRequestSchema({
    body: CreatePostSchema,
    headers: z.object({
      'x-client-version': z.string().optional(),
    }),
    queries: z.object({
      draft: z.enum(['true', 'false']).optional(),
    }),
  }),
  handler: (ctx) => {
    // All validated and fully typed!
    const { title, content, tags } = ctx.req.validated.body;
    const { 'x-client-version': clientVersion } = ctx.req.validated.headers;
    const { draft } = ctx.req.validated.queries;

    const post = {
      id: crypto.randomUUID(),
      title,
      content,
      tags,
      isDraft: draft === 'true',
      clientVersion,
      createdAt: new Date().toISOString(),
    };

    return ctx.res.status(HttpStatus.CREATED).json(post);
  },
});
```

## Content Negotiation

Error responses automatically negotiate content type based on the client's `Accept` header:

```typescript
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

// Force specific error format
app.get('/json-error', {
  handler: (ctx) => {
    return ctx.res.badRequest({
      type: 'json',
      message: 'JSON error response',
    });
  },
});
```

## Performance Tips

1. **Request data is cached**: Methods like `headers()`, `cookies()`, and `queryParams()` cache results
2. **Body methods are cached**: Multiple calls to `bodyJson()` return the same Promise
3. **Path params are pre-parsed**: `ctx.req.pathParams` is immediately available
4. **URL is cached**: `ctx.req.url()` caches the URL object

## Next Steps

- [Learn about routing patterns](/en/guide/routing)
- [Explore the plugin system](/en/guide/plugins)
- [Set up advanced validation](/en/guide/validation)

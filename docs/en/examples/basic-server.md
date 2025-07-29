# Basic Server

Ready to see everything come together? This example shows a complete, production-ready Kori server combining all the essentials: routing, plugins, error handling, and more.

> Perfect after: Getting Started → Validation → OpenAPI. This example shows how to structure a real application using everything you've learned!

## Complete Example

```typescript
import { createKori, HttpStatus } from '@korix/kori';
import { startNodeServer } from '@korix/nodejs-adapter';
import { corsPlugin } from '@korix/cors-plugin';
import { bodyLimitPlugin } from '@korix/body-limit-plugin';
import { securityHeadersPlugin } from '@korix/security-headers-plugin';

const app = createKori()
  // Add essential middleware
  .applyPlugin(corsPlugin({ origin: true }))
  .applyPlugin(bodyLimitPlugin({ maxSize: '1mb' }))
  .applyPlugin(securityHeadersPlugin())

  // Global request logging
  .onRequest((ctx) => {
    ctx.req.log().info('Request started', {
      method: ctx.req.method(),
      path: ctx.req.url().pathname,
      userAgent: ctx.req.header('user-agent'),
    });
    return ctx;
  })

  // Global error handling
  .onError((ctx, error) => {
    ctx.req.log().error('Request failed', { error: error.message });

    if (!ctx.res.isReady()) {
      ctx.res.internalError({ message: 'Something went wrong' });
    }
  });

// Health check endpoint
app.get('/health', {
  handler: (ctx) => {
    return ctx.res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  },
});

// Simple greeting
app.get('/hello/:name?', {
  handler: (ctx) => {
    const { name } = ctx.req.pathParams();
    const greeting = name ? `Hello, ${name}!` : 'Hello, World!';

    return ctx.res.json({
      message: greeting,
      timestamp: new Date().toISOString(),
    });
  },
});

// Echo endpoint that returns request info
app.post('/echo', {
  handler: async (ctx) => {
    const body = await ctx.req.bodyJson().catch(() => null);
    const queries = ctx.req.queryParams();

    return ctx.res.json({
      method: ctx.req.method(),
      path: ctx.req.url().pathname,
      queries,
      headers: ctx.req.headers(),
      body,
    });
  },
});

// Start the server
await startNodeServer(app, {
  port: 3000,
  hostname: 'localhost',
});

console.log('Server running on http://localhost:3000');
```

## Step-by-Step Breakdown

### 1. Basic Setup

```typescript
import { createKori } from '@korix/kori';
import { startNodeServer } from '@korix/nodejs-adapter';

const app = createKori();
```

### 2. Add Essential Middleware

```typescript
import { corsPlugin } from '@korix/cors-plugin';
import { bodyLimitPlugin } from '@korix/body-limit-plugin';
import { securityHeadersPlugin } from '@korix/security-headers-plugin';

const app = createKori()
  .applyPlugin(corsPlugin({ origin: true })) // Enable CORS
  .applyPlugin(bodyLimitPlugin({ maxSize: '1mb' })) // Limit request size
  .applyPlugin(securityHeadersPlugin()); // Add security headers
```

### 3. Global Hooks

```typescript
app
  .onRequest((ctx) => {
    // Log every incoming request
    ctx.req.log().info('Request received', {
      method: ctx.req.method(),
      path: ctx.req.url().pathname,
    });
    return ctx;
  })
  .onResponse((ctx) => {
    // Log response status
    ctx.req.log().info('Response sent', {
      status: ctx.res.getStatus(),
    });
  })
  .onError((ctx, error) => {
    // Handle any errors
    ctx.req.log().error('Request error', { error: error.message });

    if (!ctx.res.isReady()) {
      ctx.res.internalError({ message: 'Internal server error' });
    }
  });
```

### 4. Simple Routes

```typescript
// GET route with optional path parameter
app.get('/hello/:name?', {
  handler: (ctx) => {
    const { name } = ctx.req.pathParams();
    const message = name ? `Hello, ${name}!` : 'Hello, World!';

    return ctx.res.json({ message });
  },
});

// POST route that handles JSON body
app.post('/data', {
  handler: async (ctx) => {
    const data = await ctx.req.bodyJson();

    return ctx.res.status(HttpStatus.CREATED).json({
      received: data,
      timestamp: new Date().toISOString(),
    });
  },
});
```

### 5. Start the Server

```typescript
await startNodeServer(app, {
  port: process.env.PORT || 3000,
  hostname: 'localhost',
});

console.log('Server is running!');
```

## Essential Patterns

### Request Information

```typescript
app.get('/info', {
  handler: (ctx) => {
    return ctx.res.json({
      // URL information
      url: ctx.req.url().href,
      pathname: ctx.req.url().pathname,
      search: ctx.req.url().search,

      // Request details
      method: ctx.req.method(),
      headers: ctx.req.headers(),

      // Path and query parameters
      pathParams: ctx.req.pathParams(),
      queryParams: ctx.req.queryParams(),
    });
  },
});
```

### Error Handling

```typescript
app.get('/error-demo/:type', {
  handler: (ctx) => {
    const { type } = ctx.req.pathParams();

    switch (type) {
      case 'bad-request':
        return ctx.res.badRequest({ message: 'Invalid request' });

      case 'not-found':
        return ctx.res.notFound({ message: 'Resource not found' });

      case 'server-error':
        throw new Error('Something went wrong!');

      default:
        return ctx.res.json({ type, message: 'Demo error endpoint' });
    }
  },
});
```

### Content Types

```typescript
// JSON response
app.get('/json', {
  handler: (ctx) => ctx.res.json({ message: 'JSON response' }),
});

// Text response
app.get('/text', {
  handler: (ctx) => ctx.res.text('Plain text response'),
});

// HTML response
app.get('/html', {
  handler: (ctx) => ctx.res.html('<h1>HTML Response</h1>'),
});

// Empty response
app.delete('/item/:id', {
  handler: (ctx) => {
    const { id } = ctx.req.pathParams();
    // Delete item logic here
    return ctx.res.status(HttpStatus.NO_CONTENT).empty();
  },
});
```

### Headers and Cookies

```typescript
app.get('/cookies', {
  handler: (ctx) => {
    return ctx.res
      .setCookie('session', 'abc123', {
        httpOnly: true,
        secure: true,
        maxAge: 3600,
      })
      .setCookie('theme', 'dark')
      .json({ message: 'Cookies set!' });
  },
});

app.get('/custom-headers', {
  handler: (ctx) => {
    return ctx.res
      .setHeader('x-api-version', '1.0')
      .setHeader('x-response-time', '12ms')
      .json({ message: 'Headers set!' });
  },
});
```

## Testing the Server

### Using curl

```bash
# Health check
curl http://localhost:3000/health

# Greeting
curl http://localhost:3000/hello/Alice

# Echo with JSON
curl -X POST http://localhost:3000/echo \
  -H "content-type: application/json" \
  -d '{"name": "test", "value": 123}'

# Error demo
curl http://localhost:3000/error-demo/not-found
```

### Using fetch

```javascript
// Health check
const health = await fetch('http://localhost:3000/health');
const healthData = await health.json();
console.log(healthData);

// Post data
const response = await fetch('http://localhost:3000/echo', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    message: 'Hello from client!',
  }),
});

const data = await response.json();
console.log(data);
```

## Production Considerations

### Environment Configuration

```typescript
const port = process.env.PORT || 3000;
const hostname = process.env.HOSTNAME || 'localhost';
const isDev = process.env.NODE_ENV !== 'production';

const app = createKori()
  .applyPlugin(
    corsPlugin({
      origin: isDev ? true : ['https://myapp.com'],
      credentials: !isDev,
    }),
  )
  .applyPlugin(bodyLimitPlugin({ maxSize: '1mb' }))
  .applyPlugin(
    securityHeadersPlugin({
      strictTransportSecurity: !isDev ? 'max-age=31536000; includeSubDomains' : false,
    }),
  );
```

### Graceful Shutdown

```typescript
// Handle shutdown signals
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

await startNodeServer(app, { port, hostname });
```

### Structured Logging

```typescript
app = app.onRequest((ctx) => {
  const startTime = Date.now();
  ctx.req.log().info('Request started', {
    method: ctx.req.method(),
    path: ctx.req.url().pathname,
    userAgent: ctx.req.header('user-agent'),
    ip: ctx.req.header('x-forwarded-for') || 'unknown',
  });

  return ctx.withReq({ startTime });
});

app.onResponse((ctx) => {
  const duration = Date.now() - ctx.req.startTime;
  ctx.req.log().info('Request completed', {
    status: ctx.res.getStatus(),
    duration: `${duration}ms`,
  });
});
```

## Next Steps

- [REST API Example](/en/examples/rest-api) - Build a complete REST API
- [File Upload Example](/en/examples/file-upload) - Handle file uploads
- [WebSocket Example](/en/examples/websocket) - Real-time communication
- [Context Guide](/en/guide/context) - Detailed API reference

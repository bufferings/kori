# Body Limit Plugin

Protect your Kori application from large request payloads by limiting the size of request bodies. Essential for preventing memory exhaustion and ensuring API stability.

## Installation

```bash
npm install @korix/body-limit-plugin
```

## Basic Usage

```typescript
import { createKori } from '@korix/kori';
import { bodyLimitPlugin } from '@korix/body-limit-plugin';

const app = createKori().applyPlugin(
  bodyLimitPlugin({
    maxSize: '10mb',
  }),
);
```

## Configuration Options

### `maxSize`

Maximum allowed size for request bodies.

```typescript
// String format (human-readable)
bodyLimitPlugin({ maxSize: '1mb' }); // 1 megabyte
bodyLimitPlugin({ maxSize: '500kb' }); // 500 kilobytes
bodyLimitPlugin({ maxSize: '2gb' }); // 2 gigabytes
bodyLimitPlugin({ maxSize: '1024' }); // 1024 bytes

// Number format (bytes)
bodyLimitPlugin({ maxSize: 1048576 }); // 1MB in bytes
```

**Type:** `string | number`  
**Default:** `'1mb'`

**Supported Units:**

- `b` - bytes
- `kb` - kilobytes (1024 bytes)
- `mb` - megabytes (1024 KB)
- `gb` - gigabytes (1024 MB)

### `skipPaths`

Paths that should bypass body size checking.

```typescript
bodyLimitPlugin({
  maxSize: '1mb',
  skipPaths: ['/upload', '/webhook', /^\/api\/bulk/],
});
```

**Type:** `(string | RegExp)[]`  
**Default:** `[]`

### `onLimitExceeded`

Custom handler for when the limit is exceeded.

```typescript
bodyLimitPlugin({
  maxSize: '1mb',
  onLimitExceeded: (ctx, actualSize, maxSize) => {
    ctx.req.log().warn('Body size limit exceeded', {
      actualSize,
      maxSize,
      path: ctx.req.url().pathname,
    });

    return ctx.res.status(413).json({
      error: 'Request body too large',
      maxSize: maxSize,
      receivedSize: actualSize,
    });
  },
});
```

**Type:** `(ctx: KoriHandlerContext, actualSize: number, maxSize: number) => KoriResponse`  
**Default:** Returns HTTP 413 with error message

## Common Configurations

### API Server

```typescript
const app = createKori().applyPlugin(
  bodyLimitPlugin({
    maxSize: '1mb', // Standard for API requests
  }),
);
```

### File Upload Service

```typescript
const app = createKori().applyPlugin(
  bodyLimitPlugin({
    maxSize: '50mb', // Allow larger files
    skipPaths: ['/health', '/status'], // Skip health checks
  }),
);
```

### Microservice with Webhooks

```typescript
const app = createKori().applyPlugin(
  bodyLimitPlugin({
    maxSize: '2mb',
    skipPaths: [
      '/webhook/github', // GitHub webhooks can be large
      '/webhook/stripe', // Stripe webhooks
      /^\/admin\/import/, // Admin bulk operations
    ],
    onLimitExceeded: (ctx, actualSize, maxSize) => {
      // Custom logging and response
      ctx.req.log().error('Body limit exceeded', {
        path: ctx.req.url().pathname,
        userAgent: ctx.req.header('user-agent'),
        actualSize,
        maxSize,
      });

      return ctx.res.status(413).json({
        error: 'Request too large',
        code: 'BODY_LIMIT_EXCEEDED',
        maxSizeAllowed: `${Math.round(maxSize / 1024 / 1024)}MB`,
      });
    },
  }),
);
```

### Per-Route Limits

```typescript
const app = createKori().applyPlugin(bodyLimitPlugin({ maxSize: '1mb' })); // Default limit

// Override for specific routes using child instances
const uploadRoutes = app.createChild({
  prefix: '/upload',
  configure: (k) => k.applyPlugin(bodyLimitPlugin({ maxSize: '100mb' })),
});

uploadRoutes.post('/image', {
  handler: async (ctx) => {
    const formData = await ctx.req.bodyFormData();
    // Handle large image upload
    return ctx.res.json({ uploaded: true });
  },
});
```

## How It Works

### Early Request Termination

The plugin checks the `Content-Length` header before reading the request body:

```typescript
// Browser sends:
// POST /api/data
// Content-Length: 5242880  // 5MB

// Plugin checks: 5MB > 1MB limit
// Returns 413 immediately without reading body
```

### Memory Protection

By rejecting oversized requests early, the plugin prevents:

- Memory exhaustion from large payloads
- Slow request processing
- Potential DoS attacks

### Streaming Support

The plugin works with all body types:

- JSON payloads
- Form data (including file uploads)
- Raw binary data
- Streaming requests

## Error Responses

### Default Error Response

```json
{
  "error": "Request body too large",
  "maxSize": "1mb",
  "actualSize": "2mb"
}
```

**Status Code:** `413 Payload Too Large`

### Custom Error Response

```typescript
bodyLimitPlugin({
  maxSize: '1mb',
  onLimitExceeded: (ctx, actualSize, maxSize) => {
    // Return custom error format
    return ctx.res.status(413).json({
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'The request body exceeds the maximum allowed size',
        details: {
          maxSizeBytes: maxSize,
          actualSizeBytes: actualSize,
          maxSizeHuman: formatBytes(maxSize),
          actualSizeHuman: formatBytes(actualSize),
        },
      },
    });
  },
});
```

## Integration with Other Plugins

### With CORS Plugin

```typescript
const app = createKori()
  .applyPlugin(corsPlugin({ origin: 'https://myapp.com' }))
  .applyPlugin(bodyLimitPlugin({ maxSize: '5mb' }))
  .applyPlugin(securityHeadersPlugin());

// CORS headers will be included in 413 responses
```

### With Authentication

```typescript
const app = createKori()
  .applyPlugin(authPlugin({ secret: 'secret' }))
  .applyPlugin(
    bodyLimitPlugin({
      maxSize: '1mb',
      onLimitExceeded: (ctx, actualSize, maxSize) => {
        // Log user info if available
        ctx.req.log().warn('Body limit exceeded', {
          userId: ctx.req.currentUser?.id,
          actualSize,
          maxSize,
        });

        return ctx.res.status(413).json({
          error: 'Request body too large',
        });
      },
    }),
  );
```

## Testing

```typescript
import { describe, it, expect } from '@jest/globals';

describe('Body Limit Plugin', () => {
  it('should allow requests under the limit', async () => {
    const app = createKori()
      .applyPlugin(bodyLimitPlugin({ maxSize: '1mb' }))
      .post('/test', {
        handler: (ctx) => ctx.res.json({ received: true }),
      });

    const smallPayload = JSON.stringify({ data: 'small' });
    const response = await app.generate()(
      new Request('http://localhost/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: smallPayload,
      }),
    );

    expect(response.status).toBe(200);
  });

  it('should reject requests over the limit', async () => {
    const app = createKori().applyPlugin(bodyLimitPlugin({ maxSize: '1kb' }));

    const largePayload = 'x'.repeat(2048); // 2KB
    const response = await app.generate()(
      new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'content-type': 'text/plain',
          'Content-Length': largePayload.length.toString(),
        },
        body: largePayload,
      }),
    );

    expect(response.status).toBe(413);
  });

  it('should skip configured paths', async () => {
    const app = createKori()
      .applyPlugin(
        bodyLimitPlugin({
          maxSize: '1kb',
          skipPaths: ['/upload'],
        }),
      )
      .post('/upload', {
        handler: (ctx) => ctx.res.json({ uploaded: true }),
      });

    const largePayload = 'x'.repeat(2048); // 2KB
    const response = await app.generate()(
      new Request('http://localhost/upload', {
        method: 'POST',
        body: largePayload,
      }),
    );

    expect(response.status).toBe(200);
  });
});
```

## Best Practices

### 1. Set Appropriate Limits

```typescript
// API server - small payloads
bodyLimitPlugin({ maxSize: '1mb' });

// File upload service - larger payloads
bodyLimitPlugin({ maxSize: '50mb' });

// Webhook receiver - medium payloads
bodyLimitPlugin({ maxSize: '5mb' });
```

### 2. Use Skip Paths Wisely

```typescript
bodyLimitPlugin({
  maxSize: '1mb',
  skipPaths: [
    '/health', // Health checks don't need limits
    '/metrics', // Metrics endpoints
    '/webhook/large', // Known large webhooks
  ],
});
```

### 3. Monitor and Log

```typescript
bodyLimitPlugin({
  maxSize: '2mb',
  onLimitExceeded: (ctx, actualSize, maxSize) => {
    // Structured logging for monitoring
    ctx.req.log().warn('Body limit exceeded', {
      actualSize,
      maxSize,
      path: ctx.req.url().pathname,
      userAgent: ctx.req.header('user-agent'),
      ip: ctx.req.header('x-forwarded-for'),
      timestamp: new Date().toISOString(),
    });

    // Return user-friendly error
    return ctx.res.status(413).json({
      error: 'Request too large',
      maxSizeAllowed: '2MB',
    });
  },
});
```

### 4. Progressive Limits

```typescript
// Base app with conservative limit
const app = createKori().applyPlugin(bodyLimitPlugin({ maxSize: '1mb' }));

// API routes with standard limit
const apiRoutes = app.createChild({ prefix: '/api' });

// Upload routes with higher limit
const uploadRoutes = app.createChild({
  prefix: '/upload',
  configure: (k) => k.applyPlugin(bodyLimitPlugin({ maxSize: '50mb' })),
});

// Admin routes with very high limit
const adminRoutes = app.createChild({
  prefix: '/admin',
  configure: (k) => k.applyPlugin(bodyLimitPlugin({ maxSize: '100mb' })),
});
```

## Next Steps

- [Security Headers Plugin](/en/extensions/security-headers-plugin) - Add security headers
- [CORS Plugin](/en/extensions/cors-plugin) - Handle cross-origin requests
- [File Plugin](/en/extensions/file-plugin) - Serve static files and handle uploads

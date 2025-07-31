# CORS Plugin

Handle Cross-Origin Resource Sharing (CORS) in your Kori application with comprehensive configuration options and automatic browser compatibility.

## Installation

```bash
npm install @korix/cors-plugin
```

## Basic Usage

```typescript
import { createKori } from '@korix/kori';
import { corsPlugin } from '@korix/cors-plugin';

const app = createKori().applyPlugin(
  corsPlugin({
    origin: ['https://myapp.com', 'https://api.myapp.com'],
    credentials: true,
  }),
);
```

## Configuration Options

### `origin`

Control which origins are allowed to access your API.

```typescript
// Allow all origins (not recommended for production)
corsPlugin({ origin: true });

// Block all CORS requests
corsPlugin({ origin: false });

// Allow specific origin
corsPlugin({ origin: 'https://myapp.com' });

// Allow multiple origins
corsPlugin({
  origin: ['https://myapp.com', 'https://admin.myapp.com'],
});

// Dynamic origin validation
corsPlugin({
  origin: (requestOrigin, req) => {
    // Custom logic to determine if origin is allowed
    return requestOrigin?.endsWith('.myapp.com') ?? false;
  },
});
```

**Type:** `boolean | string | string[] | ((origin: string, req: KoriRequest) => boolean)`  
**Default:** `false`

### `credentials`

Whether to include credentials in CORS requests.

```typescript
corsPlugin({
  credentials: true, // Allow cookies and authorization headers
});
```

**Type:** `boolean`  
**Default:** `false`

⚠️ **Security Note:** When `credentials: true`, `origin` cannot be `true` (wildcard). You must specify exact origins.

### `allowMethods`

HTTP methods allowed for CORS requests.

```typescript
corsPlugin({
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});
```

**Type:** `string[]`  
**Default:** `['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE']`

### `allowHeaders`

Headers that can be used during the actual request.

```typescript
corsPlugin({
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
});
```

**Type:** `string[]`  
**Default:** `[]` (allows browser defaults)

### `exposeHeaders`

Headers that browsers are allowed to access.

```typescript
corsPlugin({
  exposeHeaders: ['x-request-id', 'x-response-time'],
});
```

**Type:** `string[]`  
**Default:** `[]`

### `maxAge`

How long browsers should cache preflight results (in seconds).

```typescript
corsPlugin({
  maxAge: 86400, // 24 hours
});
```

**Type:** `number`  
**Default:** `86400` (24 hours)

### `optionsSuccessStatus`

Status code for successful OPTIONS requests.

```typescript
corsPlugin({
  optionsSuccessStatus: 200, // Some legacy browsers need 200
});
```

**Type:** `number`  
**Default:** `204`

## Common Configurations

### Development Setup

```typescript
// Permissive for development
const app = createKori().applyPlugin(
  corsPlugin({
    origin: true,
    credentials: false,
  }),
);
```

### Production Setup

```typescript
// Secure for production
const app = createKori().applyPlugin(
  corsPlugin({
    origin: [
      'https://myapp.com',
      'https://www.myapp.com',
      'https://admin.myapp.com',
    ],
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowHeaders: ['content-type', 'authorization'],
    exposeHeaders: ['x-request-id'],
    maxAge: 86400,
  }),
);
```

### API with Authentication

```typescript
const app = createKori().applyPlugin(
  corsPlugin({
    origin: (requestOrigin, req) => {
      // Allow requests from approved domains
      const allowedDomains = ['.myapp.com', '.partner-app.com'];
      return (
        allowedDomains.some((domain) => requestOrigin?.endsWith(domain)) ??
        false
      );
    },
    credentials: true,
    allowHeaders: ['content-type', 'authorization', 'x-api-key'],
    exposeHeaders: ['x-rate-limit-remaining'],
  }),
);
```

### Microservice Communication

```typescript
const app = createKori().applyPlugin(
  corsPlugin({
    origin: ['https://frontend.myapp.com', 'https://dashboard.myapp.com'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowHeaders: ['content-type', 'authorization', 'x-service-token'],
    maxAge: 3600, // Shorter cache for internal APIs
  }),
);
```

## How It Works

### Automatic Preflight Handling

The plugin automatically handles preflight requests (OPTIONS method with `Access-Control-Request-Method` header):

```typescript
// Browser sends preflight:
// OPTIONS /api/users
// Access-Control-Request-Method: POST
// access-control-request-headers: content-type

// Plugin responds:
// access-control-allow-origin: https://myapp.com
// access-control-allow-methods: GET,POST,PUT,DELETE
// access-control-allow-headers: content-type
// Access-Control-Max-Age: 86400
```

### Vary Header Management

The plugin automatically adds `Vary: Origin` header to ensure proper caching when multiple origins are configured.

### Security Validation

- Validates that `credentials: true` isn't used with wildcard origins
- Logs warnings for potentially insecure configurations
- Handles edge cases like missing Origin headers

## Error Handling

```typescript
const app = createKori().applyPlugin(
  corsPlugin({
    origin: (requestOrigin, req) => {
      try {
        return isAllowedOrigin(requestOrigin);
      } catch (error) {
        req.log().error('CORS origin validation failed', { error });
        return false; // Deny on error
      }
    },
  }),
);
```

## Testing CORS

```typescript
import { describe, it, expect } from '@jest/globals';

describe('CORS Plugin', () => {
  it('should allow configured origins', async () => {
    const app = createKori()
      .applyPlugin(corsPlugin({ origin: 'https://myapp.com' }))
      .get('/test', { handler: (ctx) => ctx.res.json({ ok: true }) });

    const response = await app.generate()(
      new Request('http://localhost/test', {
        headers: { Origin: 'https://myapp.com' },
      }),
    );

    expect(response.headers.get('access-control-allow-origin')).toBe(
      'https://myapp.com',
    );
  });

  it('should handle preflight requests', async () => {
    const app = createKori().applyPlugin(
      corsPlugin({
        origin: 'https://myapp.com',
        allowMethods: ['POST'],
      }),
    );

    const response = await app.generate()(
      new Request('http://localhost/test', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://myapp.com',
          'access-control-request-method': 'POST',
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-methods')).toContain(
      'POST',
    );
  });
});
```

## Next Steps

- [Security Headers Plugin](/en/extensions/security-headers-plugin) - Add security headers
- [Body Limit Plugin](/en/extensions/body-limit-plugin) - Limit request body size
- [Plugin Development Guide](/en/guide/plugins) - Create custom plugins

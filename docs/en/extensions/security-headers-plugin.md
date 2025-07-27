# Security Headers Plugin

Enhance your Kori application's security by automatically adding essential security headers to all responses. Protect against common web vulnerabilities with minimal configuration.

## Installation

```bash
npm install @korix/security-headers-plugin
```

## Basic Usage

```typescript
import { createKori } from '@korix/kori';
import { securityHeadersPlugin } from '@korix/security-headers-plugin';

// Apply default security headers
const app = createKori().applyPlugin(securityHeadersPlugin());
```

## Default Security Headers

When applied with no configuration, the plugin sets these secure defaults:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: deny
X-XSS-Protection: 0
Referrer-Policy: no-referrer
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

## Configuration Options

### `frameOptions`

Control how your site can be embedded in frames.

```typescript
securityHeadersPlugin({
  frameOptions: 'deny', // Cannot be embedded (default)
  frameOptions: 'sameorigin', // Can be embedded by same origin
  frameOptions: false, // Disable header
});
```

**Type:** `'deny' | 'sameorigin' | false`  
**Default:** `'deny'`

### `contentTypeOptions`

Prevent MIME type sniffing.

```typescript
securityHeadersPlugin({
  contentTypeOptions: 'nosniff', // Prevent MIME sniffing (default)
  contentTypeOptions: false, // Disable header
});
```

**Type:** `'nosniff' | false`  
**Default:** `'nosniff'`

### `contentSecurityPolicy`

Define Content Security Policy to prevent XSS and injection attacks.

```typescript
// String format
securityHeadersPlugin({
  contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'",
});

// Object format
securityHeadersPlugin({
  contentSecurityPolicy: {
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:', 'https:'],
    },
  },
});
```

**Type:** `string | { directives: Record<string, string[]> } | false`  
**Default:** `undefined` (no CSP header)

### `strictTransportSecurity`

Enable HTTPS Strict Transport Security.

```typescript
securityHeadersPlugin({
  strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
  strictTransportSecurity: false, // Disable HSTS
});
```

**Type:** `string | false`  
**Default:** `undefined` (no HSTS header)

### `referrerPolicy`

Control referrer information sent with requests.

```typescript
securityHeadersPlugin({
  referrerPolicy: 'strict-origin-when-cross-origin',
  referrerPolicy: 'no-referrer',
  referrerPolicy: 'same-origin',
});
```

**Type:** `string | false`  
**Default:** `'no-referrer'`

### Cross-Origin Policies

Control how your site interacts with other origins.

```typescript
securityHeadersPlugin({
  crossOriginEmbedderPolicy: 'require-corp', // Default
  crossOriginOpenerPolicy: 'same-origin', // Default
  crossOriginResourcePolicy: 'same-origin', // Default
});
```

### `skipPaths`

Paths that should not receive security headers.

```typescript
securityHeadersPlugin({
  skipPaths: ['/public', '/assets', /^\/api\/webhook/],
});
```

**Type:** `(string | RegExp)[]`  
**Default:** `[]`

### `customHeaders`

Add custom security headers.

```typescript
securityHeadersPlugin({
  customHeaders: {
    'x-api-version': '1.0',
    'x-custom-security': 'enabled',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  },
});
```

**Type:** `Record<string, string>`  
**Default:** `{}`

## Common Configurations

### Basic Web Application

```typescript
const app = createKori().applyPlugin(
  securityHeadersPlugin({
    frameOptions: 'deny',
    contentTypeOptions: 'nosniff',
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https:'],
      },
    },
    strictTransportSecurity: 'max-age=31536000; includeSubDomains',
    referrerPolicy: 'strict-origin-when-cross-origin',
  }),
);
```

### API Server

```typescript
const app = createKori().applyPlugin(
  securityHeadersPlugin({
    frameOptions: 'deny',
    contentTypeOptions: 'nosniff',
    referrerPolicy: 'no-referrer',
    crossOriginResourcePolicy: 'cross-origin', // Allow API access
    customHeaders: {
      'x-api-version': '2.0',
      'x-rate-limit-policy': 'strict',
    },
  }),
);
```

### High-Security Application

```typescript
const app = createKori().applyPlugin(
  securityHeadersPlugin({
    frameOptions: 'deny',
    contentTypeOptions: 'nosniff',
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'none'"],
        'script-src': ["'self'"],
        'style-src': ["'self'"],
        'img-src': ["'self'"],
        'connect-src': ["'self'"],
        'font-src': ["'self'"],
        'object-src': ["'none'"],
        'media-src': ["'none'"],
        'child-src': ["'none'"],
      },
    },
    strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
    referrerPolicy: 'no-referrer',
    crossOriginEmbedderPolicy: 'require-corp',
    crossOriginOpenerPolicy: 'same-origin',
    crossOriginResourcePolicy: 'same-origin',
    customHeaders: {
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    },
  }),
);
```

### Application with Static Assets

```typescript
const app = createKori().applyPlugin(
  securityHeadersPlugin({
    frameOptions: 'sameorigin',
    contentTypeOptions: 'nosniff',
    skipPaths: ['/static', '/assets', '/public'], // Skip for static files
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'https:'],
      },
    },
  }),
);
```

## Content Security Policy Examples

### Basic CSP

```typescript
securityHeadersPlugin({
  contentSecurityPolicy: "default-src 'self'",
});
```

### CSP with External Resources

```typescript
securityHeadersPlugin({
  contentSecurityPolicy: {
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", 'https://cdn.jsdelivr.net'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:', 'https:', 'https://images.unsplash.com'],
      'connect-src': ["'self'", 'https://api.myapp.com'],
    },
  },
});
```

### CSP with Nonces (Advanced)

```typescript
// Generate nonce in middleware
const app = createKori()
  .onRequest((ctx) => {
    const nonce = crypto.randomUUID();
    return ctx.withReq({ nonce });
  })
  .applyPlugin(
    securityHeadersPlugin({
      contentSecurityPolicy: (req) => ({
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'", `'nonce-${req.nonce}'`],
          'style-src': ["'self'", `'nonce-${req.nonce}'`],
        },
      }),
    }),
  );
```

## Path-Based Configuration

### Skip Security Headers for Webhooks

```typescript
securityHeadersPlugin({
  frameOptions: 'deny',
  skipPaths: [
    '/webhook', // All webhook paths
    '/api/public', // Public API
    /^\/assets\/.*$/, // Static assets
  ],
});
```

### Different Headers for Different Paths

```typescript
const app = createKori();

// Default headers for main app
const appWithSecurity = app.applyPlugin(
  securityHeadersPlugin({
    frameOptions: 'deny',
    contentSecurityPolicy: "default-src 'self'",
  }),
);

// Relaxed headers for admin panel
const adminRoutes = appWithSecurity.createChild({
  prefix: '/admin',
  configure: (k) =>
    k.applyPlugin(
      securityHeadersPlugin({
        frameOptions: 'sameorigin', // Allow embedding for admin tools
        contentSecurityPolicy: {
          directives: {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'unsafe-inline'"], // Allow inline scripts
          },
        },
      }),
    ),
});
```

## Security Best Practices

### 1. Enable HTTPS First

```typescript
// Only set HSTS if serving over HTTPS
securityHeadersPlugin({
  strictTransportSecurity:
    process.env.NODE_ENV === 'production' ? 'max-age=31536000; includeSubDomains; preload' : false,
});
```

### 2. Progressive CSP Implementation

```typescript
// Start with report-only
securityHeadersPlugin({
  contentSecurityPolicy: "default-src 'self'; report-uri /csp-report",
  customHeaders: {
    'Content-Security-Policy-Report-Only': "default-src 'self'; report-uri /csp-report",
  },
});
```

### 3. Monitor and Adjust

```typescript
securityHeadersPlugin({
  customHeaders: {
    'x-security-version': '2.1',
    'x-last-updated': new Date().toISOString(),
  },
});
```

## Testing Security Headers

```typescript
import { describe, it, expect } from '@jest/globals';

describe('Security Headers Plugin', () => {
  it('should add default security headers', async () => {
    const app = createKori()
      .applyPlugin(securityHeadersPlugin())
      .get('/test', { handler: (ctx) => ctx.res.json({ ok: true }) });

    const response = await app.generate()(new Request('http://localhost/test'));

    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
  });

  it('should skip headers for configured paths', async () => {
    const app = createKori()
      .applyPlugin(
        securityHeadersPlugin({
          frameOptions: 'deny',
          skipPaths: ['/public'],
        }),
      )
      .get('/public', { handler: (ctx) => ctx.res.json({ ok: true }) });

    const response = await app.generate()(new Request('http://localhost/public'));

    expect(response.headers.get('x-frame-options')).toBeNull();
  });

  it('should add custom headers', async () => {
    const app = createKori()
      .applyPlugin(
        securityHeadersPlugin({
          customHeaders: {
            'x-api-version': '1.0',
          },
        }),
      )
      .get('/test', { handler: (ctx) => ctx.res.json({ ok: true }) });

    const response = await app.generate()(new Request('http://localhost/test'));

    expect(response.headers.get('x-api-version')).toBe('1.0');
  });
});
```

## Security Headers Reference

| Header                         | Purpose                   | Recommendation                        |
| ------------------------------ | ------------------------- | ------------------------------------- |
| `X-Frame-Options`              | Prevent clickjacking      | `DENY` or `SAMEORIGIN`                |
| `X-Content-Type-Options`       | Prevent MIME sniffing     | `nosniff`                             |
| `X-XSS-Protection`             | Legacy XSS protection     | `0` (disabled, rely on CSP)           |
| `Content-Security-Policy`      | Prevent XSS and injection | Custom based on needs                 |
| `Strict-Transport-Security`    | Force HTTPS               | `max-age=31536000; includeSubDomains` |
| `Referrer-Policy`              | Control referrer info     | `strict-origin-when-cross-origin`     |
| `Cross-Origin-Embedder-Policy` | Control embedding         | `require-corp`                        |
| `Cross-Origin-Opener-Policy`   | Control popup access      | `same-origin`                         |
| `Cross-Origin-Resource-Policy` | Control resource sharing  | `same-origin` or `cross-origin`       |

## Next Steps

- [CORS Plugin](/en/extensions/cors-plugin) - Handle cross-origin requests
- [Body Limit Plugin](/en/extensions/body-limit-plugin) - Limit request body size
- [Plugin Development Guide](/en/guide/plugins) - Create custom security plugins

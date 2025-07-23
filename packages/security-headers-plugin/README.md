# @korix/security-headers-plugin

Security headers plugin for Kori framework that adds common security headers to HTTP responses.

## Installation

```bash
pnpm add @korix/security-headers-plugin
```

## Usage

### Basic Usage

```typescript
import { createKori } from '@korix/kori';
import { securityHeadersPlugin } from '@korix/security-headers-plugin';

const app = createKori()
  .applyPlugin(securityHeadersPlugin())
  .get('/api/users', (ctx) => {
    return ctx.res.json({ users: [] });
  });
```

### Custom Configuration

```typescript
const app = createKori()
  .applyPlugin(
    securityHeadersPlugin({
      frameOptions: 'sameorigin',
      contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'",
      strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
      customHeaders: {
        'X-Custom-Header': 'custom-value',
      },
      skipPaths: ['/public', /^\/assets/],
    }),
  )
  .get('/api/data', (ctx) => {
    return ctx.res.json({ data: 'secure' });
  });
```

## Security Headers

The plugin sets the following headers by default:

- **x-frame-options**: `deny`
- **x-content-type-options**: `nosniff`
- **x-xss-protection**: `0` (explicitly disabled - this header is deprecated and can introduce vulnerabilities)
- **strict-transport-security**: `max-age=31536000; includeSubDomains`
- **referrer-policy**: `strict-origin-when-cross-origin`
- **x-permitted-cross-domain-policies**: `none`
- **x-download-options**: `noopen`

Additional headers can be enabled through configuration.

## Important Notes

### X-XSS-Protection Header

The `x-xss-protection` header is **deprecated** and modern browsers (Chrome, Edge, Firefox) have removed support for it. When enabled (`xssProtection: true`), this plugin sets the header to `0` to explicitly disable the legacy XSS auditor in older browsers, as it can introduce security vulnerabilities.

**Recommendation**: Use Content Security Policy (CSP) instead for modern XSS protection:

```typescript
securityHeadersPlugin({
  contentSecurityPolicy: "default-src 'self'; script-src 'self'",
  xssProtection: true, // Sets X-XSS-Protection: 0
});
```

## License

MIT

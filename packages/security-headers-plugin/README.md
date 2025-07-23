# @korix/security-headers-plugin

Security headers plugin for Kori framework that adds common security headers to HTTP responses.

## Installation

```bash
npm install @korix/security-headers-plugin
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
- **x-xss-protection**: `1; mode=block`
- **strict-transport-security**: `max-age=31536000; includeSubDomains`
- **referrer-policy**: `strict-origin-when-cross-origin`
- **x-permitted-cross-domain-policies**: `none`
- **x-download-options**: `noopen`

Additional headers can be enabled through configuration.

## License

MIT

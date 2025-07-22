import { createKori } from '@korix/kori';
import { securityHeadersPlugin } from '@korix/security-headers-plugin';

// Basic security headers setup
const app1 = createKori()
  .applyPlugin(securityHeadersPlugin())
  .get('/api/basic', (ctx) => {
    return ctx.res.json({ message: 'Response with default security headers' });
  });

// Custom security headers configuration
const app2 = createKori()
  .applyPlugin(
    securityHeadersPlugin({
      frameOptions: 'SAMEORIGIN',
      contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
      strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
      referrerPolicy: 'strict-origin',
      crossOriginEmbedderPolicy: 'require-corp',
      crossOriginOpenerPolicy: 'same-origin',
      crossOriginResourcePolicy: 'same-origin',
      customHeaders: {
        'X-Custom-Security': 'enabled',
        'X-API-Version': '1.0',
      },
    }),
  )
  .get('/api/secure', (ctx) => {
    return ctx.res.json({ data: 'Highly secured endpoint' });
  });

// Security headers with path exclusions
const app3 = createKori()
  .applyPlugin(
    securityHeadersPlugin({
      frameOptions: 'DENY',
      contentTypeOptions: 'nosniff',
      skipPaths: ['/public', '/assets', /^\/docs/],
    }),
  )
  .get('/api/protected', (ctx) => {
    return ctx.res.json({ message: 'Protected with security headers' });
  })
  .get('/public', (ctx) => {
    return ctx.res.json({ message: 'Public endpoint without security headers' });
  })
  .get('/assets/image.jpg', (ctx) => {
    return ctx.res.json({ message: 'Asset endpoint without security headers' });
  })
  .get('/docs/api', (ctx) => {
    return ctx.res.json({ message: 'Documentation endpoint without security headers' });
  });

// Disable specific headers
const app4 = createKori()
  .applyPlugin(
    securityHeadersPlugin({
      frameOptions: false, // Disable x-frame-options
      xssProtection: false, // Disable x-xss-protection (modern browsers don't need it)
      strictTransportSecurity: false, // Disable HSTS (for development)
      contentSecurityPolicy: "default-src 'self'",
    }),
  )
  .get('/api/minimal', (ctx) => {
    return ctx.res.json({ message: 'Minimal security headers' });
  });

export { app1, app2, app3, app4 };

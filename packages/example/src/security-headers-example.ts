import { createKori } from '@korix/kori';
import { securityHeadersPlugin, type SecurityHeadersOptions } from '@korix/security-headers-plugin';

// Basic security headers setup
// This sets default headers including x-xss-protection: 0 to disable legacy XSS auditor
const app1 = createKori()
  .applyPlugin(securityHeadersPlugin())
  .get('/api/basic', (ctx) => {
    return ctx.res.json({ message: 'Response with default security headers' });
  });

// Custom security headers configuration
const app2 = createKori()
  .applyPlugin(
    securityHeadersPlugin({
      frameOptions: 'sameorigin',
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
      frameOptions: 'deny',
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
      xssProtection: false, // Don't set x-xss-protection header (when enabled, automatically sets to '0')
      strictTransportSecurity: false, // Disable HSTS (for development)
      contentSecurityPolicy: "default-src 'self'", // Use CSP for modern XSS protection instead
    }),
  )
  .get('/api/minimal', (ctx) => {
    return ctx.res.json({ message: 'Minimal security headers with CSP-based XSS protection' });
  });

// Explicitly enable X-XSS-Protection (sets to '0' to disable legacy XSS auditor)
const xssProtectionOptions: SecurityHeadersOptions = {
  xssProtection: true, // This will set X-XSS-Protection: 0
  contentSecurityPolicy: "default-src 'self'; script-src 'self'", // Use CSP for modern XSS protection
};

const app5 = createKori()
  .applyPlugin(securityHeadersPlugin(xssProtectionOptions))
  .get('/api/xss-safe', (ctx) => {
    return ctx.res.json({
      message: 'XSS protection via CSP, legacy auditor disabled',
      note: 'X-XSS-Protection header is set to 0 for safety',
    });
  });

export { app1, app2, app3, app4, app5 };

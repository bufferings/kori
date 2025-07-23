# @korix/security-headers-plugin

## 0.1.0-alpha.2

### Patch Changes

- 6c7ae5a: Add HTTP cookie support and improve security headers plugin

  - **Cookie Support**: Add complete HTTP cookie parsing and serialization with `req.cookies()`, `req.cookie()`, `res.setCookie()`, and `res.clearCookie()` APIs
  - **Security Headers**: Make `xssProtection` configurable and standardize `frameOptions` to lowercase values
  - **Documentation**: Fix installation commands and improve header value documentation

- Updated dependencies [6c7ae5a]
  - @korix/kori@0.1.0-alpha.6

## 0.1.0-alpha.1

### Patch Changes

Initial release of security headers plugin for Kori framework

- Adds common security headers to HTTP responses with secure, modern defaults:
  - `content-security-policy` (defaults to `frame-ancestors 'none'` for clickjacking protection)
  - `x-frame-options` (defaults to `deny` for legacy browser compatibility)
  - `x-content-type-options`
  - `x-xss-protection` (fixed to `0` and not configurable)
  - `strict-transport-security`
  - `referrer-policy`
  - `x-permitted-cross-domain-policies`
  - `x-download-options`
  - `cross-origin-embedder-policy`
  - `cross-origin-opener-policy`
  - `cross-origin-resource-policy`
- Support for custom headers
- Path-based header skipping with string and regex patterns
- Configurable header values with secure defaults
- CSP-first approach for modern web security best practices

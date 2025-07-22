# @korix/security-headers-plugin

## 0.1.0-alpha.0

### Major Changes

- Initial release of security headers plugin for Kori framework
- Adds common security headers to HTTP responses:
  - X-Frame-Options
  - X-Content-Type-Options 
  - X-XSS-Protection
  - Strict-Transport-Security
  - Referrer-Policy
  - Content-Security-Policy
  - X-Permitted-Cross-Domain-Policies
  - X-Download-Options
  - Cross-Origin-Embedder-Policy
  - Cross-Origin-Opener-Policy
  - Cross-Origin-Resource-Policy
- Support for custom headers
- Path-based header skipping with string and regex patterns
- Configurable header values with secure defaults
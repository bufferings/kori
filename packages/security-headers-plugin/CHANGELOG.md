# @korix/security-headers-plugin

## 0.1.0-alpha.0

### Major Changes

- Initial release of security headers plugin for Kori framework
- Adds common security headers to HTTP responses:
  - x-frame-options
  - x-content-type-options 
  - x-xss-protection
  - strict-transport-security
  - referrer-policy
  - content-security-policy
  - x-permitted-cross-domain-policies
  - x-download-options
  - cross-origin-embedder-policy
  - cross-origin-opener-policy
  - cross-origin-resource-policy
- Support for custom headers
- Path-based header skipping with string and regex patterns
- Configurable header values with secure defaults
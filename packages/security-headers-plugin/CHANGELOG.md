# @korix/security-headers-plugin

## 0.1.1

### Patch Changes

- 4783d3b: Standardize HTTP header names using constants

  Replace hardcoded header strings with HttpResponseHeader constants for better consistency and type safety:

  - Add missing header constants to HttpResponseHeader (cache-control, content-length, etag, etc.)
  - Replace hardcoded strings like 'cache-control', 'etag' with HttpResponseHeader.CACHE_CONTROL, HttpResponseHeader.ETAG
  - Apply standardization across all plugins and examples
  - Improve typo prevention and code maintainability

- Updated dependencies [e10a8ce]
- Updated dependencies [816f76e]
- Updated dependencies [8ab7c31]
- Updated dependencies [4783d3b]
- Updated dependencies [040994a]
- Updated dependencies [5f0249e]
- Updated dependencies [066741f]
- Updated dependencies [6b5ded8]
  - @korix/kori@0.1.1

## 0.1.1-alpha.0

### Patch Changes

- 4783d3b: Standardize HTTP header names using constants

  Replace hardcoded header strings with HttpResponseHeader constants for better consistency and type safety:

  - Add missing header constants to HttpResponseHeader (cache-control, content-length, etag, etc.)
  - Replace hardcoded strings like 'cache-control', 'etag' with HttpResponseHeader.CACHE_CONTROL, HttpResponseHeader.ETAG
  - Apply standardization across all plugins and examples
  - Improve typo prevention and code maintainability

- Updated dependencies [e10a8ce]
- Updated dependencies [816f76e]
- Updated dependencies [8ab7c31]
- Updated dependencies [4783d3b]
- Updated dependencies [040994a]
- Updated dependencies [5f0249e]
- Updated dependencies [066741f]
- Updated dependencies [6b5ded8]
  - @korix/kori@0.1.1-alpha.0

## 0.1.0

### Patch Changes

- f18a452: Add HTTP cookie support and improve security headers plugin

  - **Cookie Support**: Add complete HTTP cookie parsing and serialization with `req.cookies()`, `req.cookie()`, `res.setCookie()`, and `res.clearCookie()` APIs
  - **Security Headers**: Make `xssProtection` configurable and standardize `frameOptions` to lowercase values
  - **Documentation**: Fix installation commands and improve header value documentation

- 2a1b032: Initial release of security headers plugin for Kori framework

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

- Updated dependencies [f18a452]
- Updated dependencies [42ed758]
- Updated dependencies [f496d82]
- Updated dependencies [d008f26]
- Updated dependencies [0d13f42]
- Updated dependencies [8cc10fa]
  - @korix/kori@0.1.0

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

# @korix/kori

## 0.1.1-alpha.0

### Patch Changes

- e10a8ce: Add RFC 6265 compliant cookie name validation

  Cookie names are now validated to ensure they contain only valid characters according to RFC 6265 specification. The validation prevents cookie parsing issues by rejecting names with spaces, semicolons, control characters, and other problematic characters. This improves security and compatibility with other frameworks like Express, Fastify, and Hono.

- 4783d3b: Standardize HTTP header names using constants

  Replace hardcoded header strings with HttpResponseHeader constants for better consistency and type safety:

  - Add missing header constants to HttpResponseHeader (cache-control, content-length, etag, etc.)
  - Replace hardcoded strings like 'cache-control', 'etag' with HttpResponseHeader.CACHE_CONTROL, HttpResponseHeader.ETAG
  - Apply standardization across all plugins and examples
  - Improve typo prevention and code maintainability

- 5f0249e: Standardize response methods to use method chaining pattern

  Response body methods now require method chaining for setting status codes:

  - `res.json(body, 404)` → `res.status(404).json(body)`
  - `res.text(body, 201)` → `res.status(201).text(body)`
  - `res.empty(304)` → `res.status(304).empty()`
  - `res.stream(data, 200)` → `res.status(200).stream(data)`

- 066741f: Fix header and status code preservation in KoriResponse

  - Fix: `setHeader('content-type', 'custom')` now preserved when calling body methods like `stream()` or `json()`
  - Fix: `status(400).empty()` now preserves the status code instead of overwriting with 204

## 0.1.0

### Patch Changes

- f18a452: Add HTTP cookie support and improve security headers plugin

  - **Cookie Support**: Add complete HTTP cookie parsing and serialization with `req.cookies()`, `req.cookie()`, `res.setCookie()`, and `res.clearCookie()` APIs
  - **Security Headers**: Make `xssProtection` configurable and standardize `frameOptions` to lowercase values
  - **Documentation**: Fix installation commands and improve header value documentation

- 42ed758: Fix request body cloning to allow multiple read formats

  Previously, reading request body in different formats (e.g., json() followed by text()) would cause "body stream already read" error due to sharing the same cloned request. Each body method now creates a new clone, allowing safe mixing of different read formats while maintaining cache efficiency for repeated calls of the same format.

- f496d82: Fix UNSUPPORTED_MEDIA_TYPE to return proper 415 status code

  - Add proper 415 status code handling for unsupported media type errors
  - Include detailed error information with supported types and requested type
  - Improve error handling flow for pre-validation media type errors

- d008f26: Optimize request/response pipeline and router

  - KoriRequest properties are now methods (url(), method(), headers(), etc.)
  - Router uses regex path extraction and adds fast-path routing
  - KoriResponse uses lightweight ResState with lazy header creation

  Breaking change: existing code needs to be updated to use the new method-based API.

- 0d13f42: Refactor the logger to be accessed via a `log()` method instead of a property. This improves consistency and prepares for future enhancements where logger instances might be dynamically created or configured.
- 8cc10fa: Refactor response header API and unify plugin names

## 0.1.0-alpha.6

### Patch Changes

- 6c7ae5a: Add HTTP cookie support and improve security headers plugin

  - **Cookie Support**: Add complete HTTP cookie parsing and serialization with `req.cookies()`, `req.cookie()`, `res.setCookie()`, and `res.clearCookie()` APIs
  - **Security Headers**: Make `xssProtection` configurable and standardize `frameOptions` to lowercase values
  - **Documentation**: Fix installation commands and improve header value documentation

## 0.1.0-alpha.5

### Patch Changes

- Fix UNSUPPORTED_MEDIA_TYPE to return proper 415 status code

  - Add proper 415 status code handling for unsupported media type errors
  - Include detailed error information with supported types and requested type
  - Improve error handling flow for pre-validation media type errors

## 0.1.0-alpha.4

### Patch Changes

- Refactor response header API and unify plugin names

## 0.1.0-alpha.3

### Patch Changes

- Refactor the logger to be accessed via a `log()` method instead of a property. This improves consistency and prepares for future enhancements where logger instances might be dynamically created or configured.

## 0.1.0-alpha.2

### Patch Changes

- Fix request body cloning to allow multiple read formats

  Previously, reading request body in different formats (e.g., json() followed by text()) would cause "body stream already read" error due to sharing the same cloned request. Each body method now creates a new clone, allowing safe mixing of different read formats while maintaining cache efficiency for repeated calls of the same format.

## 0.1.0-alpha.1

### Patch Changes

- 5dd65db: Optimize request/response pipeline and router

  - KoriRequest properties are now methods (url(), method(), headers(), etc.)
  - Router uses regex path extraction and adds fast-path routing
  - KoriResponse uses lightweight ResState with lazy header creation

  Breaking change: existing code needs to be updated to use the new method-based API.

## 0.1.0-alpha.0

### Minor Changes

- Initial alpha release with unified versioning

  All packages are now starting from v0.1.0-alpha.0 for consistent alpha development phase.

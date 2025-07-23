# @korix/kori

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

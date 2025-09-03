# @korix/security-headers-plugin

## 0.2.0

### Minor Changes

- 061b2f2: Framework architecture redesign and API improvements

  **New Features:**

  - Enhanced content-type support for multi-media request/response handling
  - Provider-based schema constraint system for better type safety
  - Customizable onRouteNotFound handler option
  - Comprehensive validation error handling with cascading fallback logic

  **Architecture Changes:**

  - Complete schema system redesign with separate request-schema/response-schema modules
  - Validation system restructured: request-validation → request-validator with internal resolvers
  - Routing system redesigned with new path-params and validation error handling
  - Router module replaced with route-matcher for better separation of concerns

  **API Improvements:**

  - Logger functions renamed for consistency: createPluginLogger → createKoriPluginLogger
  - Schema creation APIs updated for new content-type system
  - Validation APIs restructured for better developer experience
  - Internal route handling optimizations

### Patch Changes

- 965c6be: Refactor logging system and add plugin logger support

  This release significantly improves the logging infrastructure with better plugin integration and simplified API design.

  **Breaking Changes in @korix/kori:**

  The following context methods have been removed and replaced with standalone functions:

  - `ctx.createSysLogger()` → `createSystemLogger({ baseLogger: ctx.log() })`
  - `ctx.createPluginLogger(name)` → `createPluginLogger({ baseLogger: ctx.log(), pluginName: name })`

  **New Features:**

  - Add `createPluginLogger()` function for better plugin log organization
  - Add `createSystemLogger()` function for framework internal logging
  - Plugin loggers automatically namespace logs under `plugin.{pluginName}` channels
  - Simplified logging system with removal of complex lazy initialization

  **Improvements:**

  - All official plugins now use dedicated plugin loggers for better debugging
  - Enhanced plugin logging documentation with comprehensive examples
  - Streamlined context logger implementation and test coverage
  - Better error handling and serialization in logging infrastructure

  **Migration Guide:**

  ```typescript
  // Before
  const sysLog = ctx.createSysLogger();
  const pluginLog = ctx.createPluginLogger('my-plugin');

  // After
  import { createSystemLogger, createPluginLogger } from '@korix/kori';

  const sysLog = createSystemLogger({ baseLogger: ctx.log() });
  const pluginLog = createPluginLogger({
    baseLogger: ctx.log(),
    pluginName: 'my-plugin',
  });
  ```

  All official plugins and adapters have been updated to use the new logging API internally, but their public APIs remain unchanged.

- Updated dependencies [7166746]
- Updated dependencies [061b2f2]
- Updated dependencies [90dee5e]
- Updated dependencies [965c6be]
  - @korix/kori@0.2.0

## 0.1.2

### Patch Changes

- faf7c12: Refactor logging system architecture from LoggerFactory to Reporter pattern

  This change introduces a comprehensive new logging architecture that uses a Reporter pattern instead of the previous LoggerFactory pattern:

  ## Core Architecture Changes

  - **Reporter pattern**: Replace `packages/pino-adapter/` with `packages/pino-log-reporter/` using Reporter pattern
  - **Consolidated logging**: Consolidate logging implementation into `packages/kori/src/logging/logger.ts`
  - **Factory-based creation**: Introduced factory-based logger creation with channel and name-based organization
  - **Plugin-specific loggers**: Added `createPluginLogger()` method for isolated plugin logging
  - **System loggers**: Added `createSysLogger()` for framework internal logging
  - **Error serialization**: New `serializeError()` utility for safe error logging
  - **Lazy initialization**: Logger factory functions are only called when logging is enabled

  ## API Changes

  - Update API names: `KoriReporter` → `KoriLogReporter`, `createKoriSimpleLoggerFactory` → `createKoriLoggerFactory`
  - Change logging method calls: `req.log().child()` → `ctx.log().channel()`, `req.log()` → `ctx.log()`
  - Removed `channel.ts` in favor of new utility-based approach
  - Added `error-serializer.ts` and `util.ts` for better code organization

  ## Implementation Details

  - Updated all context classes (`handler-context.ts`, `instance-context.ts`) with new logger methods
  - Enhanced defer callback error handling with proper logging
  - Update all plugins and examples to use new logging API

  ## Plugin Updates

  All plugins migrated to the standardized logging approach:

  - `body-limit-plugin`: Updated to use plugin-specific loggers
  - `cors-plugin`: Migrated to new logging architecture
  - `security-headers-plugin`: Adopted plugin logger pattern
  - `file-plugin-nodejs`: Updated send-file and serve-static plugins
  - `nodejs-adapter`: Updated server startup logging

  ## Breaking Changes

  - `@korix/pino-adapter` package removed, use `@korix/pino-log-reporter` instead
  - Logger creation pattern changed from direct Pino integration to Reporter-based configuration

  This refactor improves debugging capabilities, provides better log organization, and enables more flexible logging configuration.

- Updated dependencies [b9ccc4e]
- Updated dependencies [e467fdf]
- Updated dependencies [cd97f48]
- Updated dependencies [7afcfa4]
- Updated dependencies [8a2dcd5]
- Updated dependencies [4777812]
- Updated dependencies [faf7c12]
- Updated dependencies [6c8a3ce]
- Updated dependencies [d7b3394]
- Updated dependencies [cc8c36e]
- Updated dependencies [cf6aa9d]
- Updated dependencies [c47f37d]
  - @korix/kori@0.1.2

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

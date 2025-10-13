# @korix/kori

## 0.3.1

### Patch Changes

- 7f80d5d: Fix response validation bug where validators received stringified JSON instead of objects

## 0.3.0

### Minor Changes

- 9b87309: Refactor schema architecture with new adapter system

  **Breaking Changes:**

  - Remove `@korix/zod-schema` and `@korix/zod-validator` packages
  - Replace with new `@korix/standard-schema-adapter` and `@korix/zod-schema-adapter` packages

  **New Features:**

  - Introduce standard schema adapter architecture for better framework-agnostic validation
  - Add `@korix/standard-schema-adapter` for Standard Schema specification support
  - Add `@korix/zod-schema-adapter` as a dedicated Zod integration

  **Improvements:**

  - Enhanced schema validation system with cleaner separation of concerns
  - Better type safety through provider constraint system
  - Simplified API surface for schema validation
  - Update dependencies including Hono to latest version

  **Migration:**

  - Replace imports from `@korix/zod-schema` with `@korix/zod-schema-adapter`
  - Replace imports from `@korix/zod-validator` with `@korix/zod-schema-adapter`
  - Update schema creation patterns to use new adapter system

- ee17581: Upgrade all packages to version 0.3.0

### Patch Changes

- edf66ad: Redesign content-type API with proper naming and refactor internal modules

  - Redesigned content-type API with improved naming conventions
  - Renamed content-type handling to use standardized media-type terminology
  - Refactored internal validation resolver modules
  - Exposed individual logging reporter functions for public use
  - Improved request/response context handling

- f4f6812: Refactor Result API with clearer naming and consistency

  This change improves the Result type API with more intuitive naming:

  **Result type properties:**

  - `ok` → `success`
  - `error` → `reason`

  **Result factory functions:**

  - `ok()` → `succeed()`
  - `err()` → `fail()`

## 0.2.1

### Patch Changes

- 14ac491: Refactor logging system with enhanced modularity and new formatter utilities

  - Add new logging utilities: `KoriLogFormatter`, `KoriLogFilter`, `KoriLogSink` types
  - Add `createJsonFormatter()` and `createPrettyFormatter()` for flexible log formatting
  - Replace console reporter implementation with `KoriConsoleReporterPresets` for better extensibility
  - Enhance error serialization with improved handling of complex objects
  - Add comprehensive test coverage for new logging components

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

- 7166746: Simplify cookie handling and improve API safety

  This release introduces breaking changes to cookie handling:

  **Breaking Changes:**

  - **Remove Result-based cookie methods**: `req.cookiesSafe()` and `req.cookieSafe()` methods have been removed
  - **Lenient cookie parsing**: Cookie parsing now never throws exceptions and silently skips malformed entries instead of throwing `KoriCookieError`
  - **Set-Cookie header protection**: Direct manipulation of "set-cookie" header via `res.setHeader()` and `res.appendHeader()` is now prohibited and throws `KoriSetCookieHeaderError`. Use `res.setCookie()` and `res.clearCookie()` instead

  **Migration Guide:**

  ```typescript
  // Before
  const result = ctx.req.cookiesSafe();
  if (result.ok) {
    console.log(result.value);
  } else {
    console.error(result.error);
  }

  // After
  const cookies = ctx.req.cookies(); // Never throws, returns empty object for malformed headers

  // Before
  res.setHeader('set-cookie', 'sessionId=123; Path=/');

  // After
  res.setCookie('sessionId', '123', { path: '/' }); // Use dedicated cookie methods
  ```

  **Non-breaking Changes:**

  - Normalize Content-Type header format with proper spacing after semicolon
  - Add comprehensive test coverage for cookie handling
  - Improve TypeScript configuration for test files

- 90dee5e: Improve context API documentation and clean up internal exports

  - Add comprehensive TSDoc comments to KoriRequest, KoriResponse, and KoriInstanceContext with examples
  - Apply @packageInternal tags to framework infrastructure functions
  - Remove internal creation functions from public API exports (createKoriEnvironment, createKoriHandlerContext, createKoriInstanceContext, createKoriRequest, createKoriResponse)
  - Refactor internal variable names for clarity

  Note: Removed functions were internal framework functions not intended for direct user consumption.

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

## 0.1.2

### Patch Changes

- b9ccc4e: Add pathTemplate method to KoriRequest

  Add ability to retrieve the original path template (e.g., '/users/:id') from the request object. This is useful for logging, metrics collection, and debugging purposes.

  The new pathTemplate() method allows developers to access the route pattern that matched the request, which is particularly useful for:

  - Aggregating logs by route pattern instead of specific parameter values
  - Tracking API usage by endpoint pattern for metrics
  - Debugging route matching behavior
  - Implementing path template-based access control

- e467fdf: Simplify error responses to always return JSON format

  Remove automatic content negotiation for error responses and always return JSON format. This provides more predictable behavior and aligns with other frameworks like Hono and Fastify.

  Changes:

  - Remove ErrorResponseOptions.type property
  - Remove automatic content negotiation based on Accept header
  - All error responses now consistently return JSON
  - Simplify error handling implementation
  - Add comprehensive tests for JSON-only error responses

  This change makes error responses more predictable and easier to handle in client applications.

- cd97f48: Fix onClose hooks execution order to run in reverse (LIFO) order

  Previously, onClose hooks were executed in registration order, which could cause issues when plugins have dependencies. Now they execute in reverse order to ensure proper cleanup sequence - dependent plugins are cleaned up before their dependencies.

- 7afcfa4: Improve type system for path params and validated requests

  - Update WithPathParams to use Omit for proper type override
  - Simplify Validated type implementation
  - Change InferValidationOutput to method-based structure
  - Enable better type inference for route handlers

- 8a2dcd5: Use consistent unsupportedMediaType() method for 415 errors

  Replace manual status and JSON setup with the existing unsupportedMediaType() method to maintain consistency with other error response patterns in the codebase.

  Improvements:

  - Use ctx.res.unsupportedMediaType() instead of manual status/json setup
  - Remove unnecessary HttpStatus import
  - Better consistency with other error response methods (badRequest, notFound, etc.)

  This change makes the codebase more consistent and easier to maintain.

- 4777812: Add lazy log data initialization support

  Introduces factory function support for log data to improve performance by deferring expensive computations until logging is actually enabled. This change maintains full backward compatibility while adding new capabilities:

  - New `KoriLogDataFactory` type for lazy data computation
  - `KoriLogDataOrFactory` union type for flexible logging API
  - Factory functions are only executed when the log level is enabled
  - Existing object-based logging continues to work unchanged

  Example usage:

  ```typescript
  // New lazy approach - factory only runs if debug level enabled
  ctx.log().debug('Debug info', () => ({
    expensiveData: heavyComputation(), // Only runs when needed
    timestamp: Date.now(),
  }));

  // Existing approach continues to work
  ctx.log().info('Info message', { user: 'john', status: 200 });
  ```

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

- 6c8a3ce: Refactor logging system with reporter pattern

  Replace wrap-logger with reporter pattern and update logging implementation. This improves the logger architecture by introducing a more flexible reporter system while maintaining backward compatibility for the core logging API.

- d7b3394: Remove response abort functionality and simplify hook return mechanism

  This change eliminates the complex abort pattern in favor of direct response returns from hooks, making the API more intuitive and reducing cognitive overhead for developers. Hooks can now return KoriResponse directly for early termination instead of using the abort mechanism.

- cc8c36e: Remove trace log level from Kori logger

  The trace log level has been removed from the Kori logging system to simplify the log level hierarchy. This is a breaking change that affects:

  - KoriLogLevel type (no longer includes 'trace')
  - KoriLogger interface (trace() method removed)
  - Log level priority values (debug=1, info=2, warn=3, error=4, fatal=5)

  Applications using the trace log level should migrate to using debug level instead.

- cf6aa9d: BREAKING: Remove onResponse, onFinally, and onClose hooks and introduce unified defer pattern

  BREAKING CHANGES:

  - Removed `onResponse` hook - was redundant with new defer pattern
  - Removed `onFinally` hook - use `ctx.defer()` within onRequest for post-request processing
  - Removed `onClose` hook - use `ctx.defer()` within onStart for shutdown cleanup
  - Renamed `onInit` → `onStart` for consistency
  - Hook execution flow changed from `onRequest → Handler → onResponse → onFinally` to `onRequest → Handler → defer callbacks (reverse order)`
  - Instance lifecycle changed from `onInit → ... → onClose` to `onStart → ... → defer callbacks (reverse order)`
  - Simplified to 2-hook architecture for handlers: `onRequest` and `onError`
  - Simplified to 1-hook architecture for instances: `onStart`

  NEW FEATURES:

  - Response abort functionality for early request termination
  - Added `KoriResponseAbortObject` for type-safe early termination in onRequest hooks
  - Added `res.isAborted()` method to check abort status
  - Hook execution automatically respects abort state and skips remaining hooks
  - Type-safe abort handling with `KoriResponseAbort` type and `isKoriResponseAbort` guard function
  - New `ctx.defer()` method for registering cleanup operations that execute after handlers (Handler Context)
  - New `ctx.defer()` method for registering shutdown cleanup operations in onStart hooks (Instance Context)
  - Defer callbacks execute in reverse order (LIFO) ensuring proper cleanup sequence
  - Type-safe defer pattern with same context available in deferred callbacks
  - Unified defer pattern across both Handler Context and Instance Context

  MIGRATION:

  - Replace `app.onResponse(hook)` with `ctx.defer(callback)` within onRequest hooks
  - Replace `app.onFinally(hook)` with `ctx.defer(callback)` within onRequest hooks
  - Replace `app.onInit(hook)` with `app.onStart(hook)`
  - Replace `app.onClose(hook)` with `ctx.defer(callback)` within onStart hooks
  - Defer callbacks execute in reverse order (LIFO) and always run (success or error)
  - Move cleanup operations from onResponse/onFinally hooks to defer calls within onRequest
  - Move shutdown operations from onClose hooks to defer calls within onStart

- c47f37d: Remove internal information from 415 Unsupported Media Type errors

  Remove supportedTypes, requestedType, and internal error messages from 415 error responses to prevent information disclosure. The error response now returns only minimal information while maintaining consistency with other Kori error formats.

  Security improvements:

  - Remove supportedTypes array from error response
  - Remove requestedType from error response
  - Remove internal error messages
  - Use consistent error format with other Kori errors

  This change prevents potential information leakage about server implementation details.

## 0.1.1

### Patch Changes

- e10a8ce: Add RFC 6265 compliant cookie name validation

  Cookie names are now validated to ensure they contain only valid characters according to RFC 6265 specification. The validation prevents cookie parsing issues by rejecting names with spaces, semicolons, control characters, and other problematic characters. This improves security and compatibility with other frameworks like Express, Fastify, and Hono.

- 816f76e: Add Accept header-based content negotiation for error responses

  Error responses now automatically negotiate content type based on the client's Accept header:

  - application/json: Returns structured JSON error (default fallback)
  - text/html: Returns formatted HTML error page
  - text/plain: Returns simple text message

  Breaking change: ErrorResponseOptions now accepts acceptHeader parameter for content negotiation. Explicit type specification still takes precedence over content negotiation.

- 8ab7c31: Fix response builder race condition

  Prevent multiple builds of the same KoriResponse instance to avoid stream reuse issues and ensure consistent behavior across all body types. All responses now follow one-build-only semantic.

- 4783d3b: Standardize HTTP header names using constants

  Replace hardcoded header strings with HttpResponseHeader constants for better consistency and type safety:

  - Add missing header constants to HttpResponseHeader (cache-control, content-length, etag, etc.)
  - Replace hardcoded strings like 'cache-control', 'etag' with HttpResponseHeader.CACHE_CONTROL, HttpResponseHeader.ETAG
  - Apply standardization across all plugins and examples
  - Improve typo prevention and code maintainability

- 040994a: Improve logging separation between framework and user logs

  **Framework Logging Improvements:**

  - Add system logger to distinguish framework internal logs from user application logs
  - Framework logs now use `*.system` namespace (`application.system`, `request.system`)
  - User APIs (`kori.log()`, `req.log()`) remain unchanged for backward compatibility

  **Plugin Logging Fixes:**

  - Fix send-file-plugin and serve-static-plugin to use request-level logger (`req.log()`) instead of plugin-level logger in request processing
  - Ensures proper request context information in file operation logs

  **Log Namespace Changes:**

  - Framework internal logs: `application.system`, `request.system`
  - User application logs: `application`, `request` (unchanged)
  - Plugin initialization logs: `application.{pluginName}`

  This change improves log observability by clearly separating framework internal operations from user application logic.

- 5f0249e: Standardize response methods to use method chaining pattern

  Response body methods now require method chaining for setting status codes:

  - `res.json(body, 404)` → `res.status(404).json(body)`
  - `res.text(body, 201)` → `res.status(201).text(body)`
  - `res.empty(304)` → `res.status(304).empty()`
  - `res.stream(data, 200)` → `res.status(200).stream(data)`

- 066741f: Fix header and status code preservation in KoriResponse

  - Fix: `setHeader('content-type', 'custom')` now preserved when calling body methods like `stream()` or `json()`
  - Fix: `status(400).empty()` now preserves the status code instead of overwriting with 204

- 6b5ded8: Security: Remove error details from HTTP responses and framework logs

  **Breaking Changes:**

  - Remove `details` property from `ErrorResponseOptions` type
  - Simplify `ErrorResponseOptions` to single object type instead of union types

  **Security Improvements:**

  - Remove error details from default HTTP error responses to prevent information disclosure
  - Remove `{ err }` objects from framework internal logs to prevent personal information leakage
  - Standardize all framework logs to use `.child('system')` namespace
  - Update body-limit-plugin to remove internal details from error responses

  **Migration:**

  - Remove `details` property usage from custom error responses
  - Use custom validation error handlers if detailed error information is needed:
    ```typescript
    app.onRequestValidationError((ctx, errors) => {
      ctx.req.log().warn('Validation failed', { err: errors }); // User controlled
      return ctx.res.badRequest({ message: 'Invalid input' });
    });
    ```

  This change prevents potential information disclosure vulnerabilities while maintaining
  error occurrence monitoring through internal logs.

## 0.1.1-alpha.0

### Patch Changes

- e10a8ce: Add RFC 6265 compliant cookie name validation

  Cookie names are now validated to ensure they contain only valid characters according to RFC 6265 specification. The validation prevents cookie parsing issues by rejecting names with spaces, semicolons, control characters, and other problematic characters. This improves security and compatibility with other frameworks like Express, Fastify, and Hono.

- 816f76e: Add Accept header-based content negotiation for error responses

  Error responses now automatically negotiate content type based on the client's Accept header:

  - application/json: Returns structured JSON error (default fallback)
  - text/html: Returns formatted HTML error page
  - text/plain: Returns simple text message

  Breaking change: ErrorResponseOptions now accepts acceptHeader parameter for content negotiation. Explicit type specification still takes precedence over content negotiation.

- 8ab7c31: Fix response builder race condition

  Prevent multiple builds of the same KoriResponse instance to avoid stream reuse issues and ensure consistent behavior across all body types. All responses now follow one-build-only semantic.

- 4783d3b: Standardize HTTP header names using constants

  Replace hardcoded header strings with HttpResponseHeader constants for better consistency and type safety:

  - Add missing header constants to HttpResponseHeader (cache-control, content-length, etag, etc.)
  - Replace hardcoded strings like 'cache-control', 'etag' with HttpResponseHeader.CACHE_CONTROL, HttpResponseHeader.ETAG
  - Apply standardization across all plugins and examples
  - Improve typo prevention and code maintainability

- 040994a: Improve logging separation between framework and user logs

  **Framework Logging Improvements:**

  - Add system logger to distinguish framework internal logs from user application logs
  - Framework logs now use `*.system` namespace (`application.system`, `request.system`)
  - User APIs (`kori.log()`, `req.log()`) remain unchanged for backward compatibility

  **Plugin Logging Fixes:**

  - Fix send-file-plugin and serve-static-plugin to use request-level logger (`req.log()`) instead of plugin-level logger in request processing
  - Ensures proper request context information in file operation logs

  **Log Namespace Changes:**

  - Framework internal logs: `application.system`, `request.system`
  - User application logs: `application`, `request` (unchanged)
  - Plugin initialization logs: `application.{pluginName}`

  This change improves log observability by clearly separating framework internal operations from user application logic.

- 5f0249e: Standardize response methods to use method chaining pattern

  Response body methods now require method chaining for setting status codes:

  - `res.json(body, 404)` → `res.status(404).json(body)`
  - `res.text(body, 201)` → `res.status(201).text(body)`
  - `res.empty(304)` → `res.status(304).empty()`
  - `res.stream(data, 200)` → `res.status(200).stream(data)`

- 066741f: Fix header and status code preservation in KoriResponse

  - Fix: `setHeader('content-type', 'custom')` now preserved when calling body methods like `stream()` or `json()`
  - Fix: `status(400).empty()` now preserves the status code instead of overwriting with 204

- 6b5ded8: Security: Remove error details from HTTP responses and framework logs

  **Breaking Changes:**

  - Remove `details` property from `ErrorResponseOptions` type
  - Simplify `ErrorResponseOptions` to single object type instead of union types

  **Security Improvements:**

  - Remove error details from default HTTP error responses to prevent information disclosure
  - Remove `{ err }` objects from framework internal logs to prevent personal information leakage
  - Standardize all framework logs to use `.child('system')` namespace
  - Update body-limit-plugin to remove internal details from error responses

  **Migration:**

  - Remove `details` property usage from custom error responses
  - Use custom validation error handlers if detailed error information is needed:
    ```typescript
    app.onRequestValidationError((ctx, errors) => {
      ctx.req.log().warn('Validation failed', { err: errors }); // User controlled
      return ctx.res.badRequest({ message: 'Invalid input' });
    });
    ```

  This change prevents potential information disclosure vulnerabilities while maintaining
  error occurrence monitoring through internal logs.

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

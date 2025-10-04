# @korix/body-limit-plugin

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

### Patch Changes

- Updated dependencies [edf66ad]
- Updated dependencies [9b87309]
- Updated dependencies [f4f6812]
  - @korix/kori@0.3.0

## 0.2.1

### Patch Changes

- Updated dependencies [14ac491]
  - @korix/kori@0.2.1

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

- d7b3394: Remove response abort functionality and simplify hook return mechanism

  This change eliminates the complex abort pattern in favor of direct response returns from hooks, making the API more intuitive and reducing cognitive overhead for developers. Hooks can now return KoriResponse directly for early termination instead of using the abort mechanism.

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

- 34733db: Add automatic chunked transfer encoding support to body-limit-plugin

  - Implement automatic chunked transfer encoding detection and monitoring
  - Add real-time stream size validation without buffering for chunked requests
  - Maintain backward compatibility with existing Content-Length validation
  - Unify error handling for both Content-Length and chunked encoding violations

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

- 34733db: Add automatic chunked transfer encoding support to body-limit-plugin

  - Implement automatic chunked transfer encoding detection and monitoring
  - Add real-time stream size validation without buffering for chunked requests
  - Maintain backward compatibility with existing Content-Length validation
  - Unify error handling for both Content-Length and chunked encoding violations

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

- f496d82: Improve development tooling and scripts

  - Add sync:version script for automatic version synchronization
  - Add @korix/script as development dependency
  - Update package scripts to use new 'ks' CLI tool

- d008f26: Optimize request/response pipeline and router

  - KoriRequest properties are now methods (url(), method(), headers(), etc.)
  - Router uses regex path extraction and adds fast-path routing
  - KoriResponse uses lightweight ResState with lazy header creation

  Breaking change: existing code needs to be updated to use the new method-based API.

- 0d13f42: Refactor the logger to be accessed via a `log()` method instead of a property. This improves consistency and prepares for future enhancements where logger instances might be dynamically created or configured.
- 8cc10fa: Refactor response header API and unify plugin names
- Updated dependencies [f18a452]
- Updated dependencies [42ed758]
- Updated dependencies [f496d82]
- Updated dependencies [d008f26]
- Updated dependencies [0d13f42]
- Updated dependencies [8cc10fa]
  - @korix/kori@0.1.0

## 0.1.0-alpha.6

### Patch Changes

- Updated dependencies [6c7ae5a]
  - @korix/kori@0.1.0-alpha.6

## 0.1.0-alpha.5

### Patch Changes

- Improve development tooling and scripts

  - Add sync:version script for automatic version synchronization
  - Add @korix/script as development dependency
  - Update package scripts to use new 'ks' CLI tool

- Updated dependencies
  - @korix/kori@0.1.0-alpha.5

## 0.1.0-alpha.4

### Patch Changes

- Refactor response header API and unify plugin names
- Updated dependencies
  - @korix/kori@0.1.0-alpha.4

## 0.1.0-alpha.3

### Patch Changes

- Refactor the logger to be accessed via a `log()` method instead of a property. This improves consistency and prepares for future enhancements where logger instances might be dynamically created or configured.
- Updated dependencies
  - @korix/kori@0.1.0-alpha.3

## 0.1.0-alpha.2

### Patch Changes

- Updated dependencies
  - @korix/kori@0.1.0-alpha.2

## 0.1.0-alpha.1

### Patch Changes

- 5dd65db: Optimize request/response pipeline and router

  - KoriRequest properties are now methods (url(), method(), headers(), etc.)
  - Router uses regex path extraction and adds fast-path routing
  - KoriResponse uses lightweight ResState with lazy header creation

  Breaking change: existing code needs to be updated to use the new method-based API.

- Updated dependencies [5dd65db]
  - @korix/kori@0.1.0-alpha.1

## 0.1.0-alpha.0

### Minor Changes

- Initial alpha release with unified versioning

  All packages are now starting from v0.1.0-alpha.0 for consistent alpha development phase.

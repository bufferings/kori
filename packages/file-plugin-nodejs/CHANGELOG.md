# @korix/file-plugin-nodejs

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

- dfcb40d: Add comprehensive file plugin package for Node.js with dual functionality

  **Send File API (`sendFilePlugin`):**

  - `res.sendFile()` - Send files for browser display with proper Content-Type
  - `res.download()` - Force file download with attachment disposition header
  - Range requests support for streaming and partial content delivery
  - ETag and Last-Modified headers for efficient caching
  - 304 Not Modified responses to reduce bandwidth usage
  - Multipart byte ranges for multiple range requests
  - Secure path resolution and validation
  - Configurable root directory and advanced caching options

  **Static File Serving (`serveStaticPlugin`):**

  - Comprehensive static file serving with configurable mount points
  - Range requests support for streaming and partial content delivery
  - Cache optimization with ETag and Last-Modified headers
  - Security features including path traversal protection
  - Index file resolution and dotfile access control
  - Configurable options for performance tuning

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

- dfcb40d: Add comprehensive file plugin package for Node.js with dual functionality

  **Send File API (`sendFilePlugin`):**

  - `res.sendFile()` - Send files for browser display with proper Content-Type
  - `res.download()` - Force file download with attachment disposition header
  - Range requests support for streaming and partial content delivery
  - ETag and Last-Modified headers for efficient caching
  - 304 Not Modified responses to reduce bandwidth usage
  - Multipart byte ranges for multiple range requests
  - Secure path resolution and validation
  - Configurable root directory and advanced caching options

  **Static File Serving (`serveStaticPlugin`):**

  - Comprehensive static file serving with configurable mount points
  - Range requests support for streaming and partial content delivery
  - Cache optimization with ETag and Last-Modified headers
  - Security features including path traversal protection
  - Index file resolution and dotfile access control
  - Configurable options for performance tuning

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

- Updated dependencies [e10a8ce]
- Updated dependencies [816f76e]
- Updated dependencies [8ab7c31]
- Updated dependencies [4783d3b]
- Updated dependencies [040994a]
- Updated dependencies [5f0249e]
- Updated dependencies [066741f]
- Updated dependencies [6b5ded8]
  - @korix/kori@0.1.1-alpha.0

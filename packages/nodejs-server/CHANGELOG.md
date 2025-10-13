# @korix/nodejs-server

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

- 82271cb: Improve Node.js adapter with better documentation, error handling, and graceful shutdown

  - Add comprehensive README with installation and usage instructions
  - Improve graceful shutdown implementation with better error handling
  - Add detailed TSDoc comments for startNodeServer function
  - Remove enableGracefulShutdown option (always enabled for reliability)
  - Remove placeholder test file and update test scripts

- Updated dependencies [edf66ad]
- Updated dependencies [9b87309]
- Updated dependencies [f4f6812]
- Updated dependencies [ee17581]
  - @korix/kori@0.3.0

## 0.2.1

### Patch Changes

- c2e4ec6: Fix URL display in Node.js adapter to show user-friendly URLs instead of IPv6 addresses.

  - Use user-specified hostname instead of actual bind address for display
  - Convert special addresses (0.0.0.0, ::, ::1) to 'localhost' for better readability
  - Inspired by Fastify's approach for improved developer experience
  - Now shows `http://localhost:3001` instead of `http://[::1]:3001` when using localhost

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

- cc8c36e: Add dedicated logging channel for Node.js adapter

  Server startup and shutdown messages now use a dedicated 'nodejs-adapter' log channel instead of the default channel. This provides better log organization and allows for more granular log filtering in applications.

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

- 0d13f42: Refactor the logger to be accessed via a `log()` method instead of a property. This improves consistency and prepares for future enhancements where logger instances might be dynamically created or configured.
- 647356f: Refactor nodejs-adapter to move server logic out of index.ts
- Updated dependencies [f18a452]
- Updated dependencies [42ed758]
- Updated dependencies [f496d82]
- Updated dependencies [d008f26]
- Updated dependencies [0d13f42]
- Updated dependencies [8cc10fa]
  - @korix/kori@0.1.0

## 0.1.0-alpha.7

### Patch Changes

- Updated dependencies [6c7ae5a]
  - @korix/kori@0.1.0-alpha.6

## 0.1.0-alpha.6

### Patch Changes

- Updated dependencies
  - @korix/kori@0.1.0-alpha.5

## 0.1.0-alpha.5

### Patch Changes

- Updated dependencies
  - @korix/kori@0.1.0-alpha.4

## 0.1.0-alpha.4

### Patch Changes

- Refactor the logger to be accessed via a `log()` method instead of a property. This improves consistency and prepares for future enhancements where logger instances might be dynamically created or configured.
- Updated dependencies
  - @korix/kori@0.1.0-alpha.3

## 0.1.0-alpha.3

### Patch Changes

- Refactor nodejs-adapter to move server logic out of index.ts

## 0.1.0-alpha.2

### Patch Changes

- Updated dependencies
  - @korix/kori@0.1.0-alpha.2

## 0.1.0-alpha.1

### Patch Changes

- Updated dependencies [5dd65db]
  - @korix/kori@0.1.0-alpha.1

## 0.1.0-alpha.0

### Minor Changes

- Initial alpha release with unified versioning

  All packages are now starting from v0.1.0-alpha.0 for consistent alpha development phase.

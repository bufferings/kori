---
'@korix/kori': patch
'@korix/body-limit-plugin': patch
'@korix/cors-plugin': patch
'@korix/file-plugin-nodejs': patch
'@korix/security-headers-plugin': patch
'@korix/pino-log-reporter': patch
'@korix/nodejs-adapter': patch
---

Refactor logging system architecture from LoggerFactory to Reporter pattern

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

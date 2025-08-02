---
'@korix/kori': patch
'@korix/body-limit-plugin': patch
'@korix/cors-plugin': patch
'@korix/file-plugin-nodejs': patch
'@korix/security-headers-plugin': patch
'@korix/pino-log-reporter': patch
---

Refactor logging system architecture from LoggerFactory to Reporter pattern

This change introduces a new logging architecture that uses a Reporter pattern instead of the previous LoggerFactory pattern:

- Replace `packages/pino-adapter/` with `packages/pino-log-reporter/` using Reporter pattern
- Consolidate logging implementation into `packages/kori/src/logging/logger.ts`
- Update API names: `KoriReporter` → `KoriLogReporter`, `createKoriSimpleLoggerFactory` → `createKoriLoggerFactory`
- Change logging method calls: `req.log().child()` → `ctx.log().channel()`, `req.log()` → `ctx.log()`
- Update all plugins and examples to use new logging API

Breaking changes:

- `@korix/pino-adapter` package removed, use `@korix/pino-log-reporter` instead
- Logger creation pattern changed from direct Pino integration to Reporter-based configuration

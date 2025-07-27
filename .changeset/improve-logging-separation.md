---
'@korix/kori': patch
'@korix/file-plugin-nodejs': patch
---

Improve logging separation between framework and user logs

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

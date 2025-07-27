# @korix/file-plugin-nodejs

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

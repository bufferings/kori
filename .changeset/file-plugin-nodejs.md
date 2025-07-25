---
'@korix/file-plugin-nodejs': patch
---

Add comprehensive file plugin package for Node.js with dual functionality

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

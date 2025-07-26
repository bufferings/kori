---
'@korix/file-plugin-nodejs': patch
---

Add comprehensive file plugin package for Node.js with dual functionality

**Send File API (`sendFilePlugin`):**

- `res.sendFile()` - Send files for browser display with proper Content-Type
- `res.download()` - Force file download with attachment disposition header
- Secure path resolution and validation
- Configurable root directory and caching options

**Static File Serving (`serveStaticPlugin`):**

- Comprehensive static file serving with configurable mount points
- Range requests support for streaming and partial content delivery
- Cache optimization with ETag and Last-Modified headers
- Security features including path traversal protection
- Index file resolution and dotfile access control
- Configurable options for performance tuning

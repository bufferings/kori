---
'@korix/body-limit-plugin': patch
---

Add chunked transfer encoding support to body-limit-plugin

- Add enableChunkedSupport option to enable stream size monitoring for chunked requests
- Implement real-time size checking that works without Content-Length header
- Preserve existing Content-Length validation behavior for backward compatibility
- Add comprehensive logging for chunked encoding processing

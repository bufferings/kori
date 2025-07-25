---
'@korix/body-limit-plugin': patch
---

Add automatic chunked transfer encoding support to body-limit-plugin

- Implement automatic chunked transfer encoding detection and monitoring
- Add real-time stream size validation without buffering for chunked requests
- Maintain backward compatibility with existing Content-Length validation
- Unify error handling for both Content-Length and chunked encoding violations

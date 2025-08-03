---
'@korix/openapi-plugin': patch
---

Fix OpenAPI path parameter conversion and automatic parameter extraction

- Convert Hono-style path parameters (:param) to OpenAPI format ({param})
- Automatically extract path parameters from route paths for OpenAPI documentation
- Ensure all path parameters are properly included in OpenAPI parameters array
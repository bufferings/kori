---
'@korix/cors-plugin': patch
---

Refactor CORS plugin for better performance and maintainability

- Optimize header setting by pre-computing static headers at initialization time
- Separate static and dynamic header handling to eliminate runtime type checking
- Remove conditional branching in hot path for better performance
- Improve code organization by splitting into separate files
- Maintain full CORS specification compliance with secure defaults

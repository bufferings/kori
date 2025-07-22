---
'@korix/cors-plugin': patch
---

Remove PLUGIN_VERSION export from public API

- Remove PLUGIN_VERSION export from index.ts
- Plugin version is still available internally for logging purposes
- Simplifies public API surface

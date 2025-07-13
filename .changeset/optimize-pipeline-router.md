---
'@korix/kori': patch
'@korix/body-limit-plugin': patch
'@korix/cors-plugin': patch
---

Optimize request/response pipeline and router

- KoriRequest properties are now methods (url(), method(), headers(), etc.)
- Router uses regex path extraction and adds fast-path routing
- KoriResponse uses lightweight ResState with lazy header creation

Breaking change: existing code needs to be updated to use the new method-based API.

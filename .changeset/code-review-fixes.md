---
'@korix/kori': patch
'@korix/openapi-swagger-ui-plugin': patch
---

- Add `redirect()` convenience method to KoriResponse
- Implement automatic HEAD request handling (Hono-style)
- Make `createChild` options fully optional
- Fix `param()` return type to use `PathParams<Path>[K]` for correct optionality
- Remove unused `aborted` property from ResState
- Fix defer and error handling in routes without hooks
- Use `.get()` instead of `.route()` for Swagger UI routes (HEAD handled automatically)

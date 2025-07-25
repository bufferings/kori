---
'@korix/example': patch
---

Replace hardcoded status codes with constants and error helpers

Replace manual status code numbers with proper constants and helper methods:

- `res.status(400).json({...})` → `res.badRequest({...})`
- `res.status(401).json({...})` → `res.unauthorized({...})`
- `res.status(500).json({...})` → `res.internalError({...})`
- `res.status(201)` → `res.status(HttpStatus.CREATED)`

Benefits:

- Type safety and IntelliSense support
- Consistent error response format with structured JSON
- Reduced chance of typos in status codes
- More expressive and readable code

---
'@korix/static-file-plugin-nodejs': patch
---

Use KoriResponse error helper methods for better consistency

Replace manual status/json error responses with built-in helper methods:

- `res.status(404).json({...})` → `res.notFound({...})`
- `res.status(403).json({...})` → `res.forbidden({...})`

This provides structured error responses with consistent format:

```json
{
  "error": {
    "type": "NOT_FOUND",
    "message": "File not found"
  }
}
```

Benefits:

- Consistent error format across all Kori applications
- More concise and readable code
- Reduced chance of typos in status codes

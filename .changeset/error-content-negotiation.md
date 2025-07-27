---
'@korix/kori': patch
---

Add Accept header-based content negotiation for error responses

Error responses now automatically negotiate content type based on the client's Accept header:

- application/json: Returns structured JSON error (default fallback)
- text/html: Returns formatted HTML error page
- text/plain: Returns simple text message

Breaking change: ErrorResponseOptions now accepts acceptHeader parameter for content negotiation. Explicit type specification still takes precedence over content negotiation.

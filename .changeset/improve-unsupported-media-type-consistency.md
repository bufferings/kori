---
'@korix/kori': patch
---

Use consistent unsupportedMediaType() method for 415 errors

Replace manual status and JSON setup with the existing unsupportedMediaType() method to maintain consistency with other error response patterns in the codebase.

Improvements:
- Use ctx.res.unsupportedMediaType() instead of manual status/json setup
- Remove unnecessary HttpStatus import
- Better consistency with other error response methods (badRequest, notFound, etc.)

This change makes the codebase more consistent and easier to maintain.
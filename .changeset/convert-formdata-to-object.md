---
'@korix/kori': patch
---

Convert FormData to plain object for validation.

This change allows validating `multipart/form-data` and `application/x-www-form-urlencoded` requests using schema libraries without specialized FormData handling.

- Single values are converted to their value directly
- Multiple values for the same key are converted to an array
- File objects are preserved as File instances

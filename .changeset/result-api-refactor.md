---
'@korix/kori': patch
'@korix/zod-validator': patch
---

Refactor Result API with clearer naming and consistency

This change improves the Result type API with more intuitive naming:

**Result type properties:**

- `ok` → `success`
- `error` → `reason`

**Result factory functions:**

- `ok()` → `succeed()`
- `err()` → `fail()`

**Validation failure types:**

- `ValidationError` → `ValidationFailureReason`
- `RequestValidationError` → `RequestValidationFailureReason`
- `ResponseValidationError` → `ResponseValidationFailureReason`

**Media type properties:**

- `supportedTypes` → `supportedMediaTypes`
- `requestType` → `requestMediaType`
- `responseType` → `responseMediaType`

This provides a more consistent and intuitive API across the framework.

**Migration Guide:**
Update all Result handling code to use the new property names and factory functions.

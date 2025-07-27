---
'@korix/kori': patch
'@korix/body-limit-plugin': patch
---

Security: Remove error details from HTTP responses and framework logs

**Breaking Changes:**

- Remove `details` property from `ErrorResponseOptions` type
- Simplify `ErrorResponseOptions` to single object type instead of union types

**Security Improvements:**

- Remove error details from default HTTP error responses to prevent information disclosure
- Remove `{ err }` objects from framework internal logs to prevent personal information leakage
- Standardize all framework logs to use `.child('system')` namespace
- Update body-limit-plugin to remove internal details from error responses

**Migration:**

- Remove `details` property usage from custom error responses
- Use custom validation error handlers if detailed error information is needed:
  ```typescript
  app.onRequestValidationError((ctx, errors) => {
    ctx.req.log().warn('Validation failed', { err: errors }); // User controlled
    return ctx.res.badRequest({ message: 'Invalid input' });
  });
  ```

This change prevents potential information disclosure vulnerabilities while maintaining
error occurrence monitoring through internal logs.

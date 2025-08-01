---
'@korix/kori': patch
---

Remove internal information from 415 Unsupported Media Type errors

Remove supportedTypes, requestedType, and internal error messages from 415 error responses to prevent information disclosure. The error response now returns only minimal information while maintaining consistency with other Kori error formats.

Security improvements:
- Remove supportedTypes array from error response
- Remove requestedType from error response  
- Remove internal error messages
- Use consistent error format with other Kori errors

This change prevents potential information leakage about server implementation details.
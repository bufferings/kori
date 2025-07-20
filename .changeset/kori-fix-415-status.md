---
'@korix/kori': patch
---

Fix UNSUPPORTED_MEDIA_TYPE to return proper 415 status code

- Add proper 415 status code handling for unsupported media type errors
- Include detailed error information with supported types and requested type
- Improve error handling flow for pre-validation media type errors

---
'@korix/kori': patch
---

Consolidate error classes into KoriError with KoriErrorCode

Replace individual error classes with unified KoriError and KoriErrorCode constants:

- Remove KoriCookieError, KoriResponseBuildError, KoriSetCookieHeaderError, KoriValidationConfigError
- Add KoriErrorCode with predefined error codes
- Make KoriError.code parameter required

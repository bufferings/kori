---
'@korix/kori': patch
'@korix/security-headers-plugin': patch
---

Standardize HTTP header names using constants

Replace hardcoded header strings with HttpResponseHeader constants for better consistency and type safety:

- Add missing header constants to HttpResponseHeader (cache-control, content-length, etag, etc.)
- Replace hardcoded strings like 'cache-control', 'etag' with HttpResponseHeader.CACHE_CONTROL, HttpResponseHeader.ETAG
- Apply standardization across all plugins and examples
- Improve typo prevention and code maintainability

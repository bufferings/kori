---
'@korix/kori': patch
---

Fix response builder race condition

Prevent multiple builds of the same KoriResponse instance to avoid stream reuse issues and ensure consistent behavior across all body types. All responses now follow one-build-only semantic.

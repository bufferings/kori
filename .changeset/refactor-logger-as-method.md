---
'@korix/kori': patch
'@korix/body-limit-plugin': patch
'@korix/cors-plugin': patch
'@korix/nodejs-adapter': patch
---

Refactor the logger to be accessed via a `log()` method instead of a property. This improves consistency and prepares for future enhancements where logger instances might be dynamically created or configured.

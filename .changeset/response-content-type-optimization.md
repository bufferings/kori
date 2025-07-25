---
'@korix/kori': patch
---

Fix Content-Type header preservation in KoriResponse

Fix: `setHeader('content-type', 'custom')` now preserved when calling body methods like `stream()` or `json()`

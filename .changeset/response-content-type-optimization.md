---
'@korix/kori': patch
---

Fix header and status code preservation in KoriResponse

- Fix: `setHeader('content-type', 'custom')` now preserved when calling body methods like `stream()` or `json()`
- Fix: `status(400).empty()` now preserves the status code instead of overwriting with 204

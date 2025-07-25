---
'@korix/kori': patch
'@korix/static-file-plugin-nodejs': patch
---

Standardize response methods to use method chaining pattern

Response body methods now require method chaining for setting status codes:

- `res.json(body, 404)` → `res.status(404).json(body)`
- `res.text(body, 201)` → `res.status(201).text(body)`
- `res.empty(304)` → `res.status(304).empty()`
- `res.stream(data, 200)` → `res.status(200).stream(data)`

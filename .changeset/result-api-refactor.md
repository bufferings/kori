---
'@korix/kori': patch
---

Refactor Result API with clearer naming and consistency

This change improves the Result type API with more intuitive naming:

**Result type properties:**

- `ok` → `success`
- `error` → `reason`

**Result factory functions:**

- `ok()` → `succeed()`
- `err()` → `fail()`

---
"@korix/kori": patch
---

Fix onClose hooks execution order to run in reverse (LIFO) order

Previously, onClose hooks were executed in registration order, which could cause issues when plugins have dependencies. Now they execute in reverse order to ensure proper cleanup sequence - dependent plugins are cleaned up before their dependencies.

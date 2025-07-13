---
'@korix/kori': patch
---

Fix request body cloning to allow multiple read formats

Previously, reading request body in different formats (e.g., json() followed by text()) would cause "body stream already read" error due to sharing the same cloned request. Each body method now creates a new clone, allowing safe mixing of different read formats while maintaining cache efficiency for repeated calls of the same format.

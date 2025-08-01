---
'@korix/zod-schema': patch
'@korix/zod-openapi-plugin': patch
'@korix/zod-validator': patch
---

Upgrade zod peer dependency from v3 to v4

This update changes the required zod version from ^3.25.0 to ^4.0.0. Users will need to upgrade their zod dependency to v4 when using these packages.

Key changes:

- Updated import paths from 'zod/v4' to 'zod' (stable release)
- Zod v4 provides improved type inference and performance
- Requires zod ^4.0.0 as peer dependency

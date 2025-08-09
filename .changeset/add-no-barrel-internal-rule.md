---
'@korix/eslint-config': patch
---

Add no-barrel-internal ESLint rule

- Add new `no-barrel-internal` rule that prevents @internal and @packageInternal symbols from being exported based on visibility level
- @internal symbols cannot be exported from any index.ts file (any barrel)
- @packageInternal symbols cannot be exported from package root src/index.ts (public barrel only)
- Uses TypeScript compiler API for accurate symbol analysis without Node.js dependencies

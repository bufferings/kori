---
'@korix/kori': patch
---

Improve context API documentation and clean up internal exports

- Add comprehensive TSDoc comments to KoriRequest, KoriResponse, and KoriInstanceContext with examples
- Apply @packageInternal tags to framework infrastructure functions
- Remove internal creation functions from public API exports (createKoriEnvironment, createKoriHandlerContext, createKoriInstanceContext, createKoriRequest, createKoriResponse)
- Refactor internal variable names for clarity

Note: Removed functions were internal framework functions not intended for direct user consumption.

---
'@korix/kori': patch
---

Improve type system for path params and validated requests

- Update WithPathParams to use Omit for proper type override
- Simplify Validated type implementation
- Change InferValidationOutput to method-based structure
- Enable better type inference for route handlers

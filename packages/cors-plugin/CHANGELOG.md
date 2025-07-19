# @korix/cors-plugin

## 0.1.0-alpha.3

### Patch Changes

- Refactor CORS plugin for better performance and maintainability

  - Optimize header setting by pre-computing static headers at initialization time
  - Separate static and dynamic header handling to eliminate runtime type checking
  - Remove conditional branching in hot path for better performance
  - Improve code organization by splitting into separate files
  - Maintain full CORS specification compliance with secure defaults

## 0.1.0-alpha.2

### Patch Changes

- Updated dependencies
  - @korix/kori@0.1.0-alpha.2

## 0.1.0-alpha.1

### Patch Changes

- 5dd65db: Optimize request/response pipeline and router

  - KoriRequest properties are now methods (url(), method(), headers(), etc.)
  - Router uses regex path extraction and adds fast-path routing
  - KoriResponse uses lightweight ResState with lazy header creation

  Breaking change: existing code needs to be updated to use the new method-based API.

- Updated dependencies [5dd65db]
  - @korix/kori@0.1.0-alpha.1

## 0.1.0-alpha.0

### Minor Changes

- Initial alpha release with unified versioning

  All packages are now starting from v0.1.0-alpha.0 for consistent alpha development phase.

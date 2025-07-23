# @korix/body-limit-plugin

## 0.1.0

### Patch Changes

- f496d82: Improve development tooling and scripts

  - Add sync:version script for automatic version synchronization
  - Add @korix/script as development dependency
  - Update package scripts to use new 'ks' CLI tool

- d008f26: Optimize request/response pipeline and router

  - KoriRequest properties are now methods (url(), method(), headers(), etc.)
  - Router uses regex path extraction and adds fast-path routing
  - KoriResponse uses lightweight ResState with lazy header creation

  Breaking change: existing code needs to be updated to use the new method-based API.

- 0d13f42: Refactor the logger to be accessed via a `log()` method instead of a property. This improves consistency and prepares for future enhancements where logger instances might be dynamically created or configured.
- 8cc10fa: Refactor response header API and unify plugin names
- Updated dependencies [f18a452]
- Updated dependencies [42ed758]
- Updated dependencies [f496d82]
- Updated dependencies [d008f26]
- Updated dependencies [0d13f42]
- Updated dependencies [8cc10fa]
  - @korix/kori@0.1.0

## 0.1.0-alpha.6

### Patch Changes

- Updated dependencies [6c7ae5a]
  - @korix/kori@0.1.0-alpha.6

## 0.1.0-alpha.5

### Patch Changes

- Improve development tooling and scripts

  - Add sync:version script for automatic version synchronization
  - Add @korix/script as development dependency
  - Update package scripts to use new 'ks' CLI tool

- Updated dependencies
  - @korix/kori@0.1.0-alpha.5

## 0.1.0-alpha.4

### Patch Changes

- Refactor response header API and unify plugin names
- Updated dependencies
  - @korix/kori@0.1.0-alpha.4

## 0.1.0-alpha.3

### Patch Changes

- Refactor the logger to be accessed via a `log()` method instead of a property. This improves consistency and prepares for future enhancements where logger instances might be dynamically created or configured.
- Updated dependencies
  - @korix/kori@0.1.0-alpha.3

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

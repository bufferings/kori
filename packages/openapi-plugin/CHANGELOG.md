# @korix/openapi-plugin

## 0.3.0

### Minor Changes

- 9b87309: Refactor schema architecture with new adapter system

  **Breaking Changes:**

  - Remove `@korix/zod-schema` and `@korix/zod-validator` packages
  - Replace with new `@korix/standard-schema-adapter` and `@korix/zod-schema-adapter` packages

  **New Features:**

  - Introduce standard schema adapter architecture for better framework-agnostic validation
  - Add `@korix/standard-schema-adapter` for Standard Schema specification support
  - Add `@korix/zod-schema-adapter` as a dedicated Zod integration

  **Improvements:**

  - Enhanced schema validation system with cleaner separation of concerns
  - Better type safety through provider constraint system
  - Simplified API surface for schema validation
  - Update dependencies including Hono to latest version

  **Migration:**

  - Replace imports from `@korix/zod-schema` with `@korix/zod-schema-adapter`
  - Replace imports from `@korix/zod-validator` with `@korix/zod-schema-adapter`
  - Update schema creation patterns to use new adapter system

### Patch Changes

- Updated dependencies [edf66ad]
- Updated dependencies [9b87309]
- Updated dependencies [f4f6812]
  - @korix/kori@0.3.0

## 0.2.1

### Patch Changes

- Updated dependencies [14ac491]
  - @korix/kori@0.2.1

## 0.2.0

### Minor Changes

- 061b2f2: Framework architecture redesign and API improvements

  **New Features:**

  - Enhanced content-type support for multi-media request/response handling
  - Provider-based schema constraint system for better type safety
  - Customizable onRouteNotFound handler option
  - Comprehensive validation error handling with cascading fallback logic

  **Architecture Changes:**

  - Complete schema system redesign with separate request-schema/response-schema modules
  - Validation system restructured: request-validation → request-validator with internal resolvers
  - Routing system redesigned with new path-params and validation error handling
  - Router module replaced with route-matcher for better separation of concerns

  **API Improvements:**

  - Logger functions renamed for consistency: createPluginLogger → createKoriPluginLogger
  - Schema creation APIs updated for new content-type system
  - Validation APIs restructured for better developer experience
  - Internal route handling optimizations

### Patch Changes

- Updated dependencies [7166746]
- Updated dependencies [061b2f2]
- Updated dependencies [90dee5e]
- Updated dependencies [965c6be]
  - @korix/kori@0.2.0

## 0.1.2

### Patch Changes

- 4246faa: Fix OpenAPI path parameter conversion and automatic parameter extraction

  - Convert Hono-style path parameters (:param) to OpenAPI format ({param})
  - Automatically extract path parameters from route paths for OpenAPI documentation
  - Ensure all path parameters are properly included in OpenAPI parameters array

- Updated dependencies [b9ccc4e]
- Updated dependencies [e467fdf]
- Updated dependencies [cd97f48]
- Updated dependencies [7afcfa4]
- Updated dependencies [8a2dcd5]
- Updated dependencies [4777812]
- Updated dependencies [faf7c12]
- Updated dependencies [6c8a3ce]
- Updated dependencies [d7b3394]
- Updated dependencies [cc8c36e]
- Updated dependencies [cf6aa9d]
- Updated dependencies [c47f37d]
  - @korix/kori@0.1.2

## 0.1.1

### Patch Changes

- Updated dependencies [e10a8ce]
- Updated dependencies [816f76e]
- Updated dependencies [8ab7c31]
- Updated dependencies [4783d3b]
- Updated dependencies [040994a]
- Updated dependencies [5f0249e]
- Updated dependencies [066741f]
- Updated dependencies [6b5ded8]
  - @korix/kori@0.1.1

## 0.1.1-alpha.0

### Patch Changes

- Updated dependencies [e10a8ce]
- Updated dependencies [816f76e]
- Updated dependencies [8ab7c31]
- Updated dependencies [4783d3b]
- Updated dependencies [040994a]
- Updated dependencies [5f0249e]
- Updated dependencies [066741f]
- Updated dependencies [6b5ded8]
  - @korix/kori@0.1.1-alpha.0

## 0.1.0

### Patch Changes

- f496d82: Improve development tooling and scripts

  - Add sync:version script for automatic version synchronization
  - Add @korix/script as development dependency
  - Update package scripts to use new 'ks' CLI tool

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

- Updated dependencies
  - @korix/kori@0.1.0-alpha.3

## 0.1.0-alpha.2

### Patch Changes

- Updated dependencies
  - @korix/kori@0.1.0-alpha.2

## 0.1.0-alpha.1

### Patch Changes

- Updated dependencies [5dd65db]
  - @korix/kori@0.1.0-alpha.1

## 0.1.0-alpha.0

### Minor Changes

- Initial alpha release with unified versioning

  All packages are now starting from v0.1.0-alpha.0 for consistent alpha development phase.

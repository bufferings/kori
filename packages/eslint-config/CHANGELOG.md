# @korix/eslint-config

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

- ee17581: Upgrade all packages to version 0.3.0

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

- ff06644: Add no-barrel-internal ESLint rule

  - Add new `no-barrel-internal` rule that prevents @internal and @packageInternal symbols from being exported based on visibility level
  - @internal symbols cannot be exported from any index.ts file (any barrel)
  - @packageInternal symbols cannot be exported from package root src/index.ts (public barrel only)
  - Uses TypeScript compiler API for accurate symbol analysis without Node.js dependencies

## 0.1.0

### Patch Changes

- 99f20c1: Add curly braces rule to ESLint config

  - Enable `curly: 'error'` rule after Prettier config
  - Enforce braces on all control statements (if, while, for, etc.)
  - Add explanatory comment about Prettier interaction

- f496d82: Update ESLint configuration and rules

  - Mark package as private and update configuration
  - Improve eslint rule implementations
  - Add curly rule enforcement

## 0.1.0-alpha.2

### Patch Changes

- Update ESLint configuration and rules

  - Mark package as private and update configuration
  - Improve eslint rule implementations
  - Add curly rule enforcement

## 0.1.0-alpha.1

### Patch Changes

- Add curly braces rule to ESLint config

  - Enable `curly: 'error'` rule after Prettier config
  - Enforce braces on all control statements (if, while, for, etc.)
  - Add explanatory comment about Prettier interaction

## 0.1.0-alpha.0

### Minor Changes

- Initial alpha release with unified versioning

  All packages are now starting from v0.1.0-alpha.0 for consistent alpha development phase.

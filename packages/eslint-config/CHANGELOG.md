# @korix/eslint-config

## 0.1.1

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

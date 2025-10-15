# @korix/standard-schema-adapter

## 0.3.2

### Patch Changes

- Updated dependencies [68d5511]
  - @korix/kori@0.3.2

## 0.3.1

### Patch Changes

- Updated dependencies [7f80d5d]
  - @korix/kori@0.3.1

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

### Patch Changes

- Updated dependencies [edf66ad]
- Updated dependencies [9b87309]
- Updated dependencies [f4f6812]
- Updated dependencies [ee17581]
  - @korix/kori@0.3.0

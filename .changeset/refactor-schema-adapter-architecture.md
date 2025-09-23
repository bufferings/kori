---
'@korix/body-limit-plugin': minor
'@korix/cors-plugin': minor
'@korix/eslint-config': minor
'@korix/file-plugin-nodejs': minor
'@korix/kori': minor
'@korix/nodejs-adapter': minor
'@korix/openapi-plugin': minor
'@korix/openapi-scalar-ui-plugin': minor
'@korix/script': minor
'@korix/security-headers-plugin': minor
'@korix/standard-schema-adapter': minor
'@korix/zod-openapi-plugin': minor
'@korix/zod-schema-adapter': minor
---

Refactor schema architecture with new adapter system

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

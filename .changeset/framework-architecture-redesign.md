---
'@korix/kori': minor
'@korix/body-limit-plugin': minor
'@korix/cors-plugin': minor
'@korix/file-plugin-nodejs': minor
'@korix/nodejs-adapter': minor
'@korix/openapi-plugin': minor
'@korix/security-headers-plugin': minor
'@korix/zod-schema': minor
'@korix/zod-validator': minor
'@korix/logtape-log-reporter': minor
'@korix/openapi-scalar-ui-plugin': minor
'@korix/pino-log-reporter': minor
'@korix/zod-openapi-plugin': minor
'@korix/eslint-config': minor
---

Framework architecture redesign and API improvements

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

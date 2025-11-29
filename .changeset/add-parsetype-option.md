---
'@korix/kori': patch
'@korix/zod-schema-adapter': patch
'@korix/standard-schema-adapter': patch
'@korix/openapi-plugin': patch
---

Add parseType option for request body content entries

Allow explicit control over how raw request body is parsed when using
content-type mapping. The parseType option supports: json, form, text,
binary, and auto (default).

Content entries can now be specified as either:

- Direct schema: `'application/json': schema`
- Object with parseType: `'application/json': { schema, parseType: 'text' }`

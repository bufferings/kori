---
'@korix/kori': patch
---

Add RFC 6265 compliant cookie name validation

Cookie names are now validated to ensure they contain only valid characters according to RFC 6265 specification. The validation prevents cookie parsing issues by rejecting names with spaces, semicolons, control characters, and other problematic characters. This improves security and compatibility with other frameworks like Express, Fastify, and Hono.

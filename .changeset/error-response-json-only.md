---
'@korix/kori': patch
---

Simplify error responses to always return JSON format

Remove automatic content negotiation for error responses and always return JSON format. This provides more predictable behavior and aligns with other frameworks like Hono and Fastify.

Changes:
- Remove ErrorResponseOptions.type property 
- Remove automatic content negotiation based on Accept header
- All error responses now consistently return JSON
- Simplify error handling implementation
- Add comprehensive tests for JSON-only error responses

This change makes error responses more predictable and easier to handle in client applications.
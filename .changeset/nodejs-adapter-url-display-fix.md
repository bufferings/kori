---
"@korix/nodejs-adapter": patch
---

Fix URL display in Node.js adapter to show user-friendly URLs instead of IPv6 addresses.

- Use user-specified hostname instead of actual bind address for display
- Convert special addresses (0.0.0.0, ::, ::1) to 'localhost' for better readability
- Inspired by Fastify's approach for improved developer experience
- Now shows `http://localhost:3001` instead of `http://[::1]:3001` when using localhost

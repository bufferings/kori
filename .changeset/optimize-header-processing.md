---
'@korix/kori': patch
---

Optimize header processing performance

This change significantly improves request handling performance by optimizing header retrieval:

- Avoid unnecessary forEach iteration when accessing individual headers by using direct header.get() access
- Eliminate duplicate split operations on Content-Type header by caching media type alongside normalized content type

Performance improvements:

- Reduces header processing overhead from ~28% to ~15-18%
- Reduces media type processing overhead by ~40%
- Expected overall request processing speedup of ~20-25%

This optimization ensures that validation library performance differences (Zod vs Valibot vs ArkType) are properly reflected in benchmarks, as the framework overhead is now minimized.

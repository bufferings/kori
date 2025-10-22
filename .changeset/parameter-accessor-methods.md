---
'@korix/kori': patch
---

Add individual parameter accessor methods

Introduce new methods for convenient access to individual path and query parameters:

- `param(name)`: Get single path parameter value
- `params()`: Get all path parameters (replaces `pathParams()`)
- `query(name)`: Get single query parameter value
- `queries()`: Get all query parameters (replaces `queryParams()`)
- `queryArray(name)`: Get all values for a query parameter as array

Breaking changes:

- Rename `pathParams()` to `params()`
- Rename `queryParams()` to `queries()`

Internal optimizations:

- Lazy query parameter parsing with caching for better performance
- Response headers now use Map instead of Headers internally
- Improved body caching with cross-format conversion support

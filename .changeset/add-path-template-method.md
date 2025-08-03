---
'@korix/kori': patch
---

Add pathTemplate method to KoriRequest

Add ability to retrieve the original path template (e.g., '/users/:id') from the request object. This is useful for logging, metrics collection, and debugging purposes.

The new pathTemplate() method allows developers to access the route pattern that matched the request, which is particularly useful for:
- Aggregating logs by route pattern instead of specific parameter values
- Tracking API usage by endpoint pattern for metrics
- Debugging route matching behavior
- Implementing path template-based access control
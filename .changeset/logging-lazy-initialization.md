---
'@korix/kori': patch
---

Add lazy log data initialization support

Introduces factory function support for log data to improve performance by deferring expensive computations until logging is actually enabled. This change maintains full backward compatibility while adding new capabilities:

- New `KoriLogDataFactory` type for lazy data computation
- `KoriLogDataOrFactory` union type for flexible logging API
- Factory functions are only executed when the log level is enabled
- Existing object-based logging continues to work unchanged

Example usage:

```typescript
// New lazy approach - factory only runs if debug level enabled
ctx.log().debug('Debug info', () => ({
  expensiveData: heavyComputation(), // Only runs when needed
  timestamp: Date.now(),
}));

// Existing approach continues to work
ctx.log().info('Info message', { user: 'john', status: 200 });
```

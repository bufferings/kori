---
'@korix/kori': patch
---

Reverse onResponse hook execution order and add response abort functionality

- onResponse hooks now execute in normal order instead of reverse order
- OnRequest hook return type changed from KoriResponse to KoriResponseAbort
- Response abort functionality for early request termination
- Added `res.abort()` method that returns a type-safe abort object
- Added `res.isAborted()` method to check abort status
- Hook execution automatically respects abort state and skips remaining hooks
- Type-safe abort handling with `KoriResponseAbort` type and `isKoriResponseAbort` guard function
- Improved error handling in hooks with try-catch blocks

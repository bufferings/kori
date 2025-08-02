---
'@korix/kori': patch
---

BREAKING: Remove onResponse, onFinally, and onClose hooks and introduce unified defer pattern

BREAKING CHANGES:

- Removed `onResponse` hook - was redundant with new defer pattern
- Removed `onFinally` hook - use `ctx.defer()` within onRequest for post-request processing
- Removed `onClose` hook - use `ctx.defer()` within onStart for shutdown cleanup
- Renamed `onInit` → `onStart` for consistency
- Hook execution flow changed from `onRequest → Handler → onResponse → onFinally` to `onRequest → Handler → defer callbacks (reverse order)`
- Instance lifecycle changed from `onInit → ... → onClose` to `onStart → ... → defer callbacks (reverse order)`
- Simplified to 2-hook architecture for handlers: `onRequest` and `onError`
- Simplified to 1-hook architecture for instances: `onStart`

NEW FEATURES:

- Response abort functionality for early request termination
- Added `KoriResponseAbortObject` for type-safe early termination in onRequest hooks
- Added `res.isAborted()` method to check abort status
- Hook execution automatically respects abort state and skips remaining hooks
- Type-safe abort handling with `KoriResponseAbort` type and `isKoriResponseAbort` guard function
- New `ctx.defer()` method for registering cleanup operations that execute after handlers (Handler Context)
- New `ctx.defer()` method for registering shutdown cleanup operations in onStart hooks (Instance Context)
- Defer callbacks execute in reverse order (LIFO) ensuring proper cleanup sequence
- Type-safe defer pattern with same context available in deferred callbacks
- Unified defer pattern across both Handler Context and Instance Context

MIGRATION:

- Replace `app.onResponse(hook)` with `ctx.defer(callback)` within onRequest hooks
- Replace `app.onFinally(hook)` with `ctx.defer(callback)` within onRequest hooks
- Replace `app.onInit(hook)` with `app.onStart(hook)`
- Replace `app.onClose(hook)` with `ctx.defer(callback)` within onStart hooks
- Defer callbacks execute in reverse order (LIFO) and always run (success or error)
- Move cleanup operations from onResponse/onFinally hooks to defer calls within onRequest
- Move shutdown operations from onClose hooks to defer calls within onStart

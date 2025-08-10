---
'@korix/kori': patch
---

Simplify cookie handling and improve API safety

This release introduces breaking changes to cookie handling:

**Breaking Changes:**

- **Remove Result-based cookie methods**: `req.cookiesSafe()` and `req.cookieSafe()` methods have been removed
- **Lenient cookie parsing**: Cookie parsing now never throws exceptions and silently skips malformed entries instead of throwing `KoriCookieError`
- **Set-Cookie header protection**: Direct manipulation of "set-cookie" header via `res.setHeader()` and `res.appendHeader()` is now prohibited and throws `KoriSetCookieHeaderError`. Use `res.setCookie()` and `res.clearCookie()` instead

**Migration Guide:**

```typescript
// Before
const result = ctx.req.cookiesSafe();
if (result.ok) {
  console.log(result.value);
} else {
  console.error(result.error);
}

// After
const cookies = ctx.req.cookies(); // Never throws, returns empty object for malformed headers

// Before
res.setHeader('set-cookie', 'sessionId=123; Path=/');

// After
res.setCookie('sessionId', '123', { path: '/' }); // Use dedicated cookie methods
```

**Non-breaking Changes:**

- Normalize Content-Type header format with proper spacing after semicolon
- Add comprehensive test coverage for cookie handling
- Improve TypeScript configuration for test files

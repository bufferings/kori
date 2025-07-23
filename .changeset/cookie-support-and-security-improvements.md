---
'@korix/kori': patch
'@korix/security-headers-plugin': patch
---

Add HTTP cookie support and improve security headers plugin

- **Cookie Support**: Add complete HTTP cookie parsing and serialization with `req.cookies()`, `req.cookie()`, `res.setCookie()`, and `res.clearCookie()` APIs
- **Security Headers**: Make `xssProtection` configurable and standardize `frameOptions` to lowercase values
- **Documentation**: Fix installation commands and improve header value documentation

---
'@korix/nodejs-adapter': patch
---

Add dedicated logging channel for Node.js adapter

Server startup and shutdown messages now use a dedicated 'nodejs-adapter' log channel instead of the default channel. This provides better log organization and allows for more granular log filtering in applications.

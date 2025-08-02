---
'@korix/kori': patch
---

Remove trace log level from Kori logger

The trace log level has been removed from the Kori logging system to simplify the log level hierarchy. This is a breaking change that affects:

- KoriLogLevel type (no longer includes 'trace')
- KoriLogger interface (trace() method removed)
- Log level priority values (debug=1, info=2, warn=3, error=4, fatal=5)

Applications using the trace log level should migrate to using debug level instead.

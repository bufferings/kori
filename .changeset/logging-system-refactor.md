---
'@korix/kori': patch
---

Refactor logging system with enhanced modularity and new formatter utilities

- Add new logging utilities: `KoriLogFormatter`, `KoriLogFilter`, `KoriLogSink` types
- Add `createJsonFormatter()` and `createPrettyFormatter()` for flexible log formatting
- Replace console reporter implementation with `KoriConsoleReporterPresets` for better extensibility
- Enhance error serialization with improved handling of complex objects
- Add comprehensive test coverage for new logging components

---
'@korix/kori': patch
'@korix/body-limit-plugin': patch
'@korix/cors-plugin': patch
'@korix/file-plugin-nodejs': patch
'@korix/security-headers-plugin': patch
'@korix/nodejs-adapter': patch
---

Refactor logging system and add plugin logger support

This release significantly improves the logging infrastructure with better plugin integration and simplified API design.

**Breaking Changes in @korix/kori:**

The following context methods have been removed and replaced with standalone functions:

- `ctx.createSysLogger()` → `createSystemLogger({ baseLogger: ctx.log() })`
- `ctx.createPluginLogger(name)` → `createPluginLogger({ baseLogger: ctx.log(), pluginName: name })`

**New Features:**

- Add `createPluginLogger()` function for better plugin log organization
- Add `createSystemLogger()` function for framework internal logging
- Plugin loggers automatically namespace logs under `plugin.{pluginName}` channels
- Simplified logging system with removal of complex lazy initialization

**Improvements:**

- All official plugins now use dedicated plugin loggers for better debugging
- Enhanced plugin logging documentation with comprehensive examples
- Streamlined context logger implementation and test coverage
- Better error handling and serialization in logging infrastructure

**Migration Guide:**

```typescript
// Before
const sysLog = ctx.createSysLogger();
const pluginLog = ctx.createPluginLogger('my-plugin');

// After
import { createSystemLogger, createPluginLogger } from '@korix/kori';

const sysLog = createSystemLogger({ baseLogger: ctx.log() });
const pluginLog = createPluginLogger({
  baseLogger: ctx.log(),
  pluginName: 'my-plugin',
});
```

All official plugins and adapters have been updated to use the new logging API internally, but their public APIs remain unchanged.

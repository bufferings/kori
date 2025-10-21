# Logging

Learn how to use Kori's logging features including structured JSON output, context-aware logging, and configuration options.

## Overview

Kori provides a structured logging system with configurable reporters. The logger generates structured log entries, and the default console reporter provides human-readable colored output for development.

For production applications, we recommend using high-performance loggers like Pino for better performance and features (official adapter coming soon).

## Logger Types

Kori provides loggers based on whether you're inside or outside the Kori context:

### Outside Kori Context

Use `app.log()` for application setup and system-wide events:

```typescript
const app = createKori();

// Use before starting the application
app.log().info('Setting up application', { port: 3000 });
```

### Inside Kori Context

Use `ctx.log()` within hooks and handlers:

```typescript
const app = createKori()
  .onStart(async (ctx) => {
    // Use in lifecycle hooks
    ctx.log().info('Initializing database connection');

    const db = await connectDatabase();
    return ctx.withEnv({ db });
  })
  .get('/users', (ctx) => {
    // Use in request handlers (includes request metadata automatically)
    ctx.log().info('Processing user request');
    return ctx.res.json({ users: [] });
  });
```

## Log Levels

Kori supports five log levels ordered by severity:

```typescript
app.get('/example', (ctx) => {
  const logger = ctx.log();

  logger.debug('Processing data', { userId: '123' }); // Most verbose
  logger.info('Request completed successfully');
  logger.warn('Rate limit approaching', { remaining: 5 });
  logger.error('Database connection failed', { err: error });
  logger.fatal('Critical system failure'); // Most severe

  return ctx.res.json({ result: 'ok' });
});
```

Configure the minimum log level:

```typescript
const app = createKori({
  loggerOptions: {
    level: 'info', // Only log info and above (warn, error, fatal)
  },
});
```

## Structured Logging

Kori generates structured log entries with consistent fields and timestamps. The default console reporter outputs human-readable colored logs for development:

```typescript
app.get('/users/:id', (ctx) => {
  const logger = ctx.log();

  logger.info('Fetching user', { userId: ctx.req.param('id') });

  return ctx.res.json({ user: { id: '123', name: 'John' } });
});
```

Default output (pretty format):

```log
2025-10-13T15:22:11.921Z INFO  [app:request] Fetching user {"userId":"1"}
```

For JSON format, configure the logger:

```typescript
import { KoriConsoleReporterPresets } from '@korix/kori';

const app = createKori({
  loggerOptions: {
    reporter: KoriConsoleReporterPresets.json(),
  },
});
```

JSON output:

```json
{
  "time": 1754201824386,
  "level": "info",
  "channel": "app",
  "name": "request",
  "message": "Fetching user",
  "meta": { "userId": "1" }
}
```

## Logger Configuration

Configure logging behavior at application startup:

```typescript
import { KoriConsoleReporterPresets, serializeError } from '@korix/kori';

const app = createKori({
  loggerOptions: {
    level: 'debug',
    bindings: {
      service: 'user-api',
      version: '1.2.0',
    },
    reporter: KoriConsoleReporterPresets.json(),
    errorSerializer: serializeError,
  },
});
```

Available options:

- `level`: Sets the minimum log level (logs below this level are ignored)
- `bindings`: Key-value pairs automatically added to all log entries
- `reporter`: Output configuration (default: `KoriConsoleReporterPresets.pretty()`)
- `errorSerializer`: Controls how errors are serialized for logging. Customize this to filter out sensitive information like passwords or tokens from error logs (default: `serializeError`)

## Performance Optimization

### Level Checking

Avoid expensive operations when logging is disabled:

```typescript
app.get('/debug', (ctx) => {
  const logger = ctx.log();

  // Check if debug level is enabled before expensive computation
  if (logger.isLevelEnabled('debug')) {
    const expensiveData = computeSystemMetrics(); // Only run if needed
    logger.debug('System metrics', { metrics: expensiveData });
  }

  return ctx.res.json({ status: 'ok' });
});
```

### Lazy Metadata Generation

Use functions for expensive metadata computation that only runs when logging is enabled:

```typescript
app.get('/profile', (ctx) => {
  const logger = ctx.log();

  // Function is only called if info level is enabled
  logger.info('User profile accessed', () => {
    return {
      userStats: calculateUserStatistics(ctx.req.param('id')),
      memoryUsage: process.memoryUsage(),
      timestamp: Date.now(),
    };
  });

  return ctx.res.json({ profile: getUserProfile() });
});
```

The metadata function is executed lazily - only when the log level is enabled, avoiding unnecessary computation.

## Plugin Development

When developing plugins, use `createKoriPluginLogger()` for better log organization:

```typescript
export function myPlugin<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
>(): KoriPlugin<Env, Req, Res> {
  return defineKoriPlugin({
    name: 'my-plugin',
    version: '0.0.0',
    apply(kori) {
      const log = createKoriPluginLogger({
        baseLogger: kori.log(),
        pluginName: 'my-plugin',
      });
      log.info('Plugin initialized');

      return kori.onRequest((ctx) => {
        const requestLog = createKoriPluginLogger({
          baseLogger: ctx.log(),
          pluginName: 'my-plugin',
        });
        requestLog.info('Processing request');
      });
    },
  });
}
```

Plugin loggers automatically namespace your logs under `plugin.{pluginName}` channel for better organization and debugging.

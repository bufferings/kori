# Plugins

Plugins in Kori are reusable pieces of functionality that extend your application's capabilities. They provide type-safe extensions, lifecycle hooks, and endpoints. This enables cross-cutting concerns like authentication, logging, and CORS.

## Using Plugins

Apply plugins to your Kori application using the `applyPlugin()` method. This integrates the plugin's functionality into your application:

```typescript
import { createKori } from '@korix/kori';
import { corsPlugin } from '@korix/cors-plugin';
import { bodyLimitPlugin } from '@korix/body-limit-plugin';

const app = createKori()
  .applyPlugin(
    corsPlugin({
      origin: ['https://myapp.com'],
      credentials: true,
    }),
  )
  .applyPlugin(
    bodyLimitPlugin({
      maxSize: 10 * 1024 * 1024, // 10MB in bytes
    }),
  );
```

## How Plugins Work

A plugin is a collection of hooks and endpoints grouped together. When you apply a plugin, you're registering its hooks (like onRequest, onError) and any endpoints it defines to your application.

For example, a logging plugin might use multiple hooks:

```typescript
import {
  defineKoriPlugin,
  type KoriEnvironment,
  type KoriRequest,
  type KoriResponse,
  type KoriPlugin,
} from '@korix/kori';

// Simple logging plugin structure
export function loggingPlugin<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
>(): KoriPlugin<Env, Req, Res, unknown, { startTime: number }, unknown> {
  return defineKoriPlugin({
    name: 'simple-logging',
    apply: (kori) =>
      kori.onRequest((ctx) => {
        // Log when request starts
        ctx.log().info('Request started', {
          method: ctx.req.method(),
          path: ctx.req.url().pathname,
        });

        // Defer response logging
        ctx.defer(() => {
          const duration = Date.now() - ctx.req.startTime;
          ctx.log().info('Request completed', {
            status: ctx.res.getStatus(),
            duration: `${duration}ms`,
          });
        });

        return ctx.withReq({ startTime: Date.now() });
      }),
  });
}
```

## Plugin Order

Plugins are applied in the order they are registered. Each plugin registers its hooks to the application:

```typescript
// Common order example:
const app = createKori()
  // 1st: Registers hooks for CORS preflight
  .applyPlugin(corsPlugin({ origin: true }))
  // 2nd: Registers hooks for body size check
  .applyPlugin(bodyLimitPlugin())
  // 3rd: Registers hooks for security headers
  .applyPlugin(securityHeadersPlugin());
```

## Type Extensions

Plugins can add new properties to context (environment, request, response):

```typescript
import { createKori } from '@korix/kori';
import { requestIdPlugin } from './my-plugins';

// Before plugin: ctx.req has base KoriRequest type
const baseApp = createKori();
// ctx.req: KoriRequest

// After plugin: ctx.req type is extended
const app = baseApp.applyPlugin(requestIdPlugin());
// ctx.req: KoriRequest & { requestId: string }

app.get('/test', {
  handler: (ctx) => {
    // TypeScript now knows about requestId property
    const id: string = ctx.req.requestId; // ✅ Fully typed
    return ctx.res.json({ requestId: id });
  },
});
```

### Chaining and Type Merging

When chaining multiple plugins with type extensions, their types are automatically merged:

✅ Good: Chained calls preserve type information

```typescript
import { createKori } from '@korix/kori';
import { requestIdPlugin, timingPlugin } from './my-plugins';

const app = createKori()
  // Adds { requestId: string }
  .applyPlugin(requestIdPlugin())
  // Adds { startTime: number }
  .applyPlugin(timingPlugin());
// Final type: KoriRequest & { requestId: string } & { startTime: number }

app.get('/test', {
  handler: (ctx) => {
    // TypeScript knows about both extensions
    const id: string = ctx.req.requestId; // ✅ From requestIdPlugin
    const time: number = ctx.req.startTime; // ✅ From timingPlugin

    return ctx.res.json({
      requestId: id,
      processingTime: Date.now() - time,
    });
  },
});
```

❌ Avoid: Separate calls lose type information

```typescript
import { createKori } from '@korix/kori';
import { requestIdPlugin, timingPlugin } from './my-plugins';

const app2 = createKori();

const withRequestId = app2.applyPlugin(requestIdPlugin());
// Type extension is lost when stored in variable

const withTiming = withRequestId.applyPlugin(timingPlugin());
// TypeScript doesn't know about requestId anymore

withTiming.get('/broken', {
  handler: (ctx) => {
    const id = ctx.req.requestId; // ❌ TypeScript error!
  },
});
```

## Creating Custom Plugins

Define your own plugins using `defineKoriPlugin()`.

TypeScript can automatically infer types from your context extensions, but explicit type definitions are useful for:

- Creating reusable plugins that other files will import
- Adding functions or methods to context objects
- Documenting your plugin's interface clearly

### Basic Plugin

```typescript
import {
  defineKoriPlugin,
  type KoriEnvironment,
  type KoriRequest,
  type KoriResponse,
  type KoriPlugin,
} from '@korix/kori';

const timestampPlugin = <
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
>(): KoriPlugin<Env, Req, Res> =>
  defineKoriPlugin({
    name: 'timestamp',
    apply: (kori) =>
      kori.onRequest((ctx) => {
        // Defer header setting until response is ready
        ctx.defer(() => {
          ctx.res.setHeader('x-timestamp', new Date().toISOString());
        });
      }),
  });
```

### Plugin with Type Extensions

Create plugins that extend context with new properties:

```typescript
import {
  defineKoriPlugin,
  type KoriEnvironment,
  type KoriRequest,
  type KoriResponse,
  type KoriPlugin,
} from '@korix/kori';

type RequestIdExtension = { requestId: string };

const requestIdPlugin = <
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
>(): KoriPlugin<Env, Req, Res, unknown, RequestIdExtension, unknown> =>
  defineKoriPlugin({
    name: 'request-id',
    apply: (kori) =>
      kori.onRequest((ctx) => {
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // Defer header setting until response is ready
        ctx.defer(() => {
          ctx.res.setHeader('x-request-id', ctx.req.requestId);
        });

        return ctx.withReq({ requestId });
      }),
  });
```

## Official Plugins

Kori provides official plugins for common use cases. See the Extensions section for detailed documentation.

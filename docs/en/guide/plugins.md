# Plugins

Learn how to use and create plugins to extend your Kori application's functionality. Kori's plugin system is powerful, type-safe, and allows for composable middleware-like behavior.

## What are Plugins?

Plugins in Kori are reusable pieces of functionality that can be applied to your application. They can:

- Add new properties to request/response objects (type-safe extensions)
- Add lifecycle hooks (`onRequest`, `onResponse`, `onError`, `onFinally`)
- Modify request or response handling
- Extend the application environment
- Provide cross-cutting concerns like authentication, logging, CORS, etc.

## Using Plugins

Apply plugins to your Kori application using the `applyPlugin()` method:

```typescript
import { createKori } from '@korix/kori';
import { corsPlugin } from '@korix/cors-plugin';
import { bodyLimitPlugin } from '@korix/body-limit-plugin';

const app = createKori()
  .applyPlugin(
    corsPlugin({
      origin: ['https://myapp.com', 'https://api.myapp.com'],
      credentials: true,
    }),
  )
  .applyPlugin(
    bodyLimitPlugin({
      maxSize: '10mb',
    }),
  );
```

### Plugin Order Matters

Plugins are applied in the order they are registered. Each plugin's hooks execute in the same order:

```typescript
// Execution order: cors → bodyLimit → security → custom logic
const appWithPlugins = createKori()
  .applyPlugin(corsPlugin()) // 1st: Handle CORS
  .applyPlugin(bodyLimitPlugin()) // 2nd: Check body size
  .applyPlugin(securityHeadersPlugin()); // 3rd: Add security headers

// Custom logic after plugin setup
const app = appWithPlugins.onRequest((ctx) => {
  // 4th: Custom request logic
  ctx.req.log().info('Request received');
  return ctx;
});
```

## Built-in Plugins

Kori provides several official plugins for common use cases:

### CORS Plugin

Handle Cross-Origin Resource Sharing:

```typescript
import { corsPlugin } from '@korix/cors-plugin';

const appWithCors = app.applyPlugin(
  corsPlugin({
    origin: ['https://myapp.com', 'https://api.myapp.com'],
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowHeaders: ['content-type', 'authorization'],
    exposeHeaders: ['x-request-id'],
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 204,
  }),
);

// Or simple setup
const appWithSimpleCors = app.applyPlugin(
  corsPlugin({
    origin: true, // Allow all origins (not recommended for production)
    credentials: false,
  }),
);
```

### Body Limit Plugin

Limit request body size:

```typescript
import { bodyLimitPlugin } from '@korix/body-limit-plugin';

const appWithBodyLimit = app.applyPlugin(
  bodyLimitPlugin({
    maxSize: '10mb',
  }),
);

// The plugin will automatically reject requests with bodies larger than the limit
```

### Security Headers Plugin

Add security headers to responses:

```typescript
import { securityHeadersPlugin } from '@korix/security-headers-plugin';

const appWithSecurity = app.applyPlugin(
  securityHeadersPlugin({
    frameOptions: 'deny',
    contentTypeOptions: 'nosniff',
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'",
    strictTransportSecurity: 'max-age=63072000; includeSubDomains',
    referrerPolicy: 'strict-origin',
    crossOriginEmbedderPolicy: 'require-corp',
    skipPaths: ['/public', '/assets'], // Skip security headers for these paths
    customHeaders: {
      'x-api-version': '1.0',
      'x-custom-security': 'enabled',
    },
  }),
);
```

### OpenAPI and Documentation Plugins

Generate OpenAPI specs and serve documentation:

```typescript
import { zodOpenApiPlugin, openApiMeta } from '@korix/zod-openapi-plugin';
import { scalarUiPlugin } from '@korix/openapi-scalar-ui-plugin';

app
  .applyPlugin(
    zodOpenApiPlugin({
      info: {
        title: 'My API',
        version: '1.0.0',
        description: 'A powerful API built with Kori',
      },
      servers: [
        { url: 'https://api.myapp.com', description: 'Production' },
        { url: 'http://localhost:3000', description: 'Development' },
      ],
    }),
  )
  .applyPlugin(
    scalarUiPlugin({
      path: '/docs',
      title: 'My API Documentation',
      theme: 'auto',
    }),
  );

// Use OpenAPI metadata in routes
app.get('/users/:id', {
  pluginMetadata: openApiMeta({
    summary: 'Get user by ID',
    description: 'Retrieves a single user by their unique identifier',
    tags: ['Users'],
  }),
  handler: (ctx) => {
    const { id } = ctx.req.pathParams;
    return ctx.res.json({ user: getUserById(id) });
  },
});
```

### File Serving Plugin (Node.js)

Serve static files and handle file downloads:

```typescript
import { sendFilePlugin, serveStaticPlugin } from '@korix/file-plugin-nodejs';

// Serve individual files
const appWithSendFile = app.applyPlugin(sendFilePlugin());

appWithSendFile.get('/download/:filename', {
  handler: (ctx) => {
    const { filename } = ctx.req.pathParams;
    return ctx.res.sendFile(`./uploads/${filename}`);
  },
});

// Serve static directory
const appWithStatic = app.applyPlugin(
  serveStaticPlugin({
    root: './public',
    prefix: '/static',
  }),
);
```

## Creating Custom Plugins

Define your own plugins using `defineKoriPlugin()`:

### Basic Plugin Structure

```typescript
import { defineKoriPlugin, type KoriEnvironment, type KoriRequest, type KoriResponse } from '@korix/kori';

// Simple plugin that adds a timestamp to all responses
const timestampPlugin = <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>() =>
  defineKoriPlugin<Env, Req, Res>({
    name: 'timestamp',
    version: '1.0.0',
    apply: (kori) =>
      kori.onResponse((ctx) => {
        ctx.res.setHeader('x-timestamp', new Date().toISOString());
      }),
  });

// Apply the plugin
const appWithTimestamp = app.applyPlugin(timestampPlugin());
```

### Plugin with Type Extensions

Create plugins that extend request or response objects with new properties:

```typescript
// Request ID plugin that adds requestId to the request
type RequestIdExtension = { requestId: string };

const requestIdPlugin = <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>() =>
  defineKoriPlugin<Env, Req, Res, unknown, RequestIdExtension, unknown>({
    name: 'requestId',
    version: '1.0.0',
    apply: (kori) =>
      kori
        .onRequest((ctx) => {
          const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          return ctx.withReq({ requestId });
        })
        .onResponse((ctx) => {
          ctx.res.setHeader('x-request-id', ctx.req.requestId);
        }),
  });

// Timing plugin that measures request duration
type TimingExtension = { startTime: number };

const timingPlugin = <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>() =>
  defineKoriPlugin<Env, Req, Res, unknown, TimingExtension, unknown>({
    name: 'timing',
    apply: (kori) =>
      kori
        .onRequest((ctx) => ctx.withReq({ startTime: Date.now() }))
        .onResponse((ctx) => {
          const duration = Date.now() - ctx.req.startTime;
          ctx.res.setHeader('x-response-time', `${duration}ms`);
        }),
  });

// Apply both plugins
const app = createKori().applyPlugin(requestIdPlugin()).applyPlugin(timingPlugin());

// Now you can access ctx.req.requestId and ctx.req.startTime in handlers!
app.get('/test', {
  handler: (ctx) => {
    return ctx.res.json({
      requestId: ctx.req.requestId, // TypeScript knows this exists!
      processingTime: Date.now() - ctx.req.startTime,
    });
  },
});
```

### Authentication Plugin

Create a more complex plugin for authentication:

```typescript
type UserExtension = { currentUser?: { id: string; name: string; roles: string[] } };

const authPlugin = <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(options: {
  secret: string;
  skipPaths?: string[];
}) =>
  defineKoriPlugin<Env, Req, Res, unknown, UserExtension, unknown>({
    name: 'auth',
    apply: (kori) =>
      kori
        .onRequest((ctx) => {
          const url = ctx.req.url();

          // Skip authentication for certain paths
          if (options.skipPaths?.some((path) => url.pathname.startsWith(path))) {
            return ctx.withReq({ currentUser: undefined });
          }

          const token = ctx.req.header('authorization')?.replace('Bearer ', '');

          if (!token) {
            throw new Error('No authentication token provided');
          }

          try {
            const user = verifyJWT(token, options.secret);
            return ctx.withReq({ currentUser: user });
          } catch (error) {
            throw new Error('Invalid authentication token');
          }
        })
        .onError((ctx, err) => {
          if (err instanceof Error && err.message.includes('token')) {
            return ctx.res.unauthorized({ message: err.message });
          }
        }),
  });

// Apply auth plugin
const appWithAuth = app.applyPlugin(
  authPlugin({
    secret: process.env.JWT_SECRET!,
    skipPaths: ['/auth', '/public'],
  }),
);

// Protected routes automatically have access to currentUser
appWithAuth.get('/profile', {
  handler: (ctx) => {
    if (!ctx.req.currentUser) {
      return ctx.res.unauthorized({ message: 'Authentication required' });
    }

    return ctx.res.json({ user: ctx.req.currentUser });
  },
});
```

### Environment Extension Plugin

Plugins can also extend the environment with shared resources:

```typescript
type DatabaseExtension = {
  db: {
    user: { findById: (id: string) => Promise<any> };
    post: { findAll: () => Promise<any[]> };
  };
};

const databasePlugin = <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(
  connectionString: string,
) =>
  defineKoriPlugin<Env, Req, Res, DatabaseExtension, unknown, unknown>({
    name: 'database',
    apply: (kori) =>
      kori.onInit((env) => {
        const db = createDatabase(connectionString);
        return { ...env, db };
      }),
  });

// Apply database plugin
const appWithDb = app.applyPlugin(databasePlugin('postgresql://localhost:5432/myapp'));

// Handlers can access the database
appWithDb.get('/users/:id', {
  handler: async (ctx) => {
    const { id } = ctx.req.pathParams;
    const user = await ctx.env.db.user.findById(id);
    return ctx.res.json({ user });
  },
});
```

## Plugin Hooks

Plugins can use various lifecycle hooks:

### Lifecycle Hooks

```typescript
const fullLifecyclePlugin = () =>
  defineKoriPlugin({
    name: 'fullLifecycle',
    apply: (kori) =>
      kori
        .onInit((env) => {
          console.log('Application initializing');
          return env;
        })
        .onClose((env) => {
          console.log('Application closing');
        })
        .onRequest((ctx) => {
          console.log('Request starting');
          return ctx;
        })
        .onResponse((ctx) => {
          console.log('Response ready');
        })
        .onError((ctx, error) => {
          console.log('Error occurred:', error);
        })
        .onFinally((ctx) => {
          console.log('Request completed');
        }),
  });
```

### Handler Hooks vs Instance Hooks

```typescript
// Instance hooks - apply to ALL requests
app
  .onRequest((ctx) => {
    // Runs for every request
    ctx.req.log().info('Global request log');
    return ctx;
  })
  .applyPlugin(myPlugin());

// Route-specific logic using child instances
const apiRoutes = app.createChild({
  prefix: '/api',
  configure: (k) =>
    k.onRequest((ctx) => {
      // Only runs for /api/* requests
      ctx.req.log().info('API request');
      return ctx;
    }),
});
```

## Plugin Best Practices

### 1. Use TypeScript for Type Safety

```typescript
// ✅ Good: Properly typed plugin
const typedPlugin = <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>() =>
  defineKoriPlugin<Env, Req, Res, unknown, { customProp: string }, unknown>({
    name: 'typed',
    apply: (kori) => kori.onRequest((ctx) => ctx.withReq({ customProp: 'value' })),
  });

// ❌ Avoid: Untyped plugins lose type safety
```

### 2. Handle Errors Gracefully

```typescript
const robustPlugin = () =>
  defineKoriPlugin({
    name: 'robust',
    apply: (kori) =>
      kori
        .onRequest((ctx) => {
          try {
            // Plugin logic that might fail
            return doSomethingRisky(ctx);
          } catch (error) {
            ctx.req.log().error('Plugin error', { error });
            return ctx; // Continue without the plugin's functionality
          }
        })
        .onError((ctx, err) => {
          // Handle plugin-specific errors
          if (err instanceof MyPluginError) {
            return ctx.res.badRequest({ message: 'Plugin validation failed' });
          }
        }),
  });
```

### 3. Make Plugins Configurable

```typescript
type PluginOptions = {
  enabled?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  skipPaths?: string[];
};

const configurablePlugin = (options: PluginOptions = {}) =>
  defineKoriPlugin({
    name: 'configurable',
    apply: (kori) => {
      if (!options.enabled) {
        return kori; // Plugin disabled
      }

      return kori.onRequest((ctx) => {
        const url = ctx.req.url();

        if (options.skipPaths?.some((path) => url.pathname.startsWith(path))) {
          return ctx; // Skip for certain paths
        }

        ctx.req.log()[options.logLevel ?? 'info']('Plugin executed');
        return ctx;
      });
    },
  });
```

### 4. Use Descriptive Names and Versions

```typescript
const myPlugin = () =>
  defineKoriPlugin({
    name: 'my-company-auth-plugin', // Descriptive, unique name
    version: '2.1.0', // Semantic versioning
    apply: (kori) => {
      // Plugin implementation
      return kori;
    },
  });
```

## Plugin Composition

Combine multiple plugins for complex functionality:

```typescript
// Create a "suite" of related plugins
const securitySuite = () => [
  corsPlugin({ origin: false }),
  bodyLimitPlugin({ maxSize: '1mb' }),
  securityHeadersPlugin(),
  rateLimitPlugin({ windowMs: 15 * 60 * 1000, max: 100 }),
];

// Apply all security plugins at once (maintaining type safety)
const appWithSecurity = securitySuite().reduce((currentApp, plugin) => currentApp.applyPlugin(plugin), app);

// Or create a meta-plugin
const securityMetaPlugin = () =>
  defineKoriPlugin({
    name: 'security-suite',
    apply: (kori) => {
      return securitySuite().reduce((k, plugin) => k.applyPlugin(plugin), kori);
    },
  });
```

## Testing Plugins

Test your plugins in isolation:

```typescript
import { describe, it, expect } from '@jest/globals';
import { createKori } from '@korix/kori';

describe('Request ID Plugin', () => {
  it('should add request ID to headers', async () => {
    const app = createKori()
      .applyPlugin(requestIdPlugin())
      .get('/test', {
        handler: (ctx) => ctx.res.json({ id: ctx.req.requestId }),
      });

    const response = await app.generate()(new Request('http://localhost/test'));
    const requestId = response.headers.get('x-request-id');

    expect(requestId).toMatch(/^req-\d+-[a-z0-9]+$/);

    const body = await response.json();
    expect(body.id).toBe(requestId);
  });
});
```

## Next Steps

- [Learn about request validation](/en/guide/validation)
- [Get started with Kori](/en/guide/getting-started)
- [Explore error handling patterns](/en/guide/error-handling)

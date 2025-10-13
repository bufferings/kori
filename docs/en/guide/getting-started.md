# Getting Started

Ready to build your first type-safe API? Let's get you up and running!

## Quick Setup (Coming Soon!)

```bash
npm create kori-app my-api  # 🚧 Coming Soon!
cd my-api
npm run dev
```

Your API is running at `http://localhost:3000`

## Basic API

Create your first endpoint:

```typescript
import { createKori } from '@korix/kori';

const app = createKori();

app.get('/hello', (ctx) => {
  return ctx.res.text('Hello, Kori!');
});

export { app };
```

## Request & Response

Handle different types of requests and responses:

```typescript
import { createKori } from '@korix/kori';

const app = createKori();

app.get('/users/:id', (ctx) => {
  // Path parameters
  const { id } = ctx.req.pathParams();
  return ctx.res.json({
    id,
    name: `User ${id}`,
    active: true,
  });
});

app.get('/info', (ctx) => {
  // Request/Response headers
  const userAgent = ctx.req.header('user-agent');
  return ctx.res.setHeader('x-custom', 'value').status(200).json({ userAgent });
});

export { app };
```

## Logging

Monitor your application with built-in structured logging:

```typescript
import { createKori } from '@korix/kori';

const app = createKori().onStart((ctx) => {
  // Instance-level logging (within hooks)
  ctx.log().info('Application initializing');
});

app.get('/hello', (ctx) => {
  // Request-level logging (within handlers)
  ctx.log().info('Processing hello request');

  return ctx.res.text('Hello, Kori!');
});

// Application-level logging (outside of Kori context)
app.log().info('Application will start');

export { app };
```

- **`app.log()`** - Application-level logger (outside of Kori context)
- **`ctx.log()`** - Context-aware logger (inside Kori context: hooks and handlers)

Sample log output:

```log
2025-10-13T17:52:18.186Z INFO  [app:instance] Application will start
2025-10-13T17:52:18.187Z INFO  [app:instance] Application initializing
2025-10-13T17:52:18.193Z INFO  [sys:instance] Kori server started at http://localhost:3000
2025-10-13T17:52:26.795Z INFO  [app:request] Processing hello request
```

Kori provides a simple console logger by default for quick development. For production applications, we recommend using high-performance loggers like Pino (official adapter coming soon).

## Hooks

Add initialization and request lifecycle processing:

```typescript
import { createKori } from '@korix/kori';

const app = createKori()
  .onStart((ctx) => {
    // Runs once when application starts
    return ctx.withEnv({ applicationStartTime: new Date() });
  })
  .onRequest((ctx) => {
    // Runs before each request handler
    ctx.log().info(`${ctx.req.method()} ${ctx.req.url().pathname}`);

    // Defer response logging until after handler completes
    ctx.defer(() => {
      ctx.log().info(`Response: ${ctx.res.getStatus()}`);
    });
  });

app.get('/hello', (ctx) => {
  // Type-safe access to environment extensions
  const uptime = Date.now() - ctx.env.applicationStartTime.getTime();
  return ctx.res.text(`Hello, Kori! Uptime: ${uptime}ms`);
});

export { app };
```

## Plugins

Extend functionality with reusable plugins:

```typescript
import { createKori, defineKoriPlugin } from '@korix/kori';

// Create a simple request logging plugin
const requestLoggerPlugin = () =>
  defineKoriPlugin({
    name: 'requestLogger',
    apply: (k) =>
      k.onRequest((ctx) => {
        const startTime = Date.now();

        ctx.log().info(`→ ${ctx.req.method()} ${ctx.req.url().pathname}`);

        ctx.defer(() => {
          const duration = Date.now() - startTime;
          ctx.log().info(`← ${ctx.res.getStatus()} (${duration}ms)`);
        });
      }),
  });

const app = createKori().applyPlugin(requestLoggerPlugin());

app.get('/api/data', (ctx) => {
  return ctx.res.json({ message: 'Hello!' });
});

export { app };
```

## Validation

Type-safe validation with first-class Zod support:

```typescript
import { createKori } from '@korix/kori';
import {
  zodRequestSchema,
  enableZodRequestValidation,
} from '@korix/zod-schema-adapter';
import { z } from 'zod';

const CreateUserSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(0).optional(),
});

const app = createKori({
  ...enableZodRequestValidation(),
});

app.post('/users', {
  requestSchema: zodRequestSchema({ body: CreateUserSchema }),
  handler: (ctx) => {
    // Type-safe validated body access
    const { name, age } = ctx.req.validatedBody();

    // Your business logic here (save to database, etc.)

    return ctx.res.status(201).json({
      id: '42',
      name,
      age,
      createdAt: new Date().toISOString(),
    });
  },
});

export { app };
```

## OpenAPI

Generate interactive API documentation from your validation schemas:

```typescript
import { createKori } from '@korix/kori';
import {
  zodRequestSchema,
  enableZodRequestValidation,
} from '@korix/zod-schema-adapter';
import { zodOpenApiPlugin } from '@korix/zod-openapi-plugin';
import { swaggerUiPlugin } from '@korix/openapi-swagger-ui-plugin';
import { z } from 'zod';

const CreateUserSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(0).optional(),
});

const app = createKori({
  ...enableZodRequestValidation(),
})
  // Generate OpenAPI specification from Zod schemas
  .applyPlugin(
    zodOpenApiPlugin({
      info: { title: 'My API', version: '1.0.0' },
    }),
  )
  // Serve interactive documentation UI
  .applyPlugin(swaggerUiPlugin());

app.post('/users', {
  requestSchema: zodRequestSchema({ body: CreateUserSchema }),
  responseSchema: zodResponseSchema({ default: z.any() }),
  handler: (ctx) => {
    // Type-safe validated body access
    const { name, age } = ctx.req.validatedBody();

    // Your business logic here (save to database, etc.)

    return ctx.res.status(201).json({
      id: '42',
      name,
      age,
      createdAt: new Date().toISOString(),
    });
  },
});

export { app };
```

Visit `http://localhost:3000/docs` for interactive documentation!

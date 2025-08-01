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

const app = createKori().onInit(async (ctx) => {
  // Application-level logging (for system events)
  app.log().info('Application initializing');
});

app.get('/hello', (ctx) => {
  // Request-level logging (includes request context automatically)
  ctx.req.log().info('Processing hello request');

  return ctx.res.text('Hello, Kori!');
});

export { app };
```

Sample log output:

```json
{"level":"info","time":1704067200000,"name":"application","message":"Application initializing"}
{"level":"info","time":1704067200100,"name":"request","message":"Processing hello request"}
```

Kori provides a simple console logger by default for quick development. For real applications, use high-performance loggers like Pino. We provide a Pino adapter for easy integration.

## Hooks

Add initialization and request lifecycle processing:

```typescript
import { createKori } from '@korix/kori';

const app = createKori()
  .onInit(async (ctx) => {
    // Runs once when application starts
    return ctx.withEnv({ applicationStartTime: new Date() });
  })
  .onRequest((ctx) => {
    // Runs before each request handler
    ctx.req.log().info(`${ctx.req.method()} ${ctx.req.url().pathname}`);
  })
  .onResponse((ctx) => {
    // Runs after each successful response
    ctx.req.log().info(`Response: ${ctx.res.status()}`);
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
import { createKori } from '@korix/kori';
import { securityHeadersPlugin } from '@korix/security-headers-plugin';

const app = createKori()
  // Add security headers to all responses
  .applyPlugin(securityHeadersPlugin());

app.get('/api/data', (ctx) => {
  return ctx.res.json({ message: 'Secure API!' });
});

export { app };
```

## Validation

Type-safe validation with first-class Zod support:

```typescript
import { createKori } from '@korix/kori';
import { zodRequestSchema } from '@korix/zod-schema';
import { createKoriZodRequestValidator } from '@korix/zod-validator';
import { z } from 'zod';

const CreateUserSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(0).optional(),
});

const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
});

app.post('/users', {
  requestSchema: zodRequestSchema({ body: CreateUserSchema }),
  handler: (ctx) => {
    // Type-safe validated body access
    const { name, age } = ctx.req.validatedBody();

    // Your business logic here (save to database, etc.)

    return ctx.res.status(201).json({
      id: Math.random().toString(36),
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
import { createKoriZodRequestValidator } from '@korix/zod-validator';
import { zodRequestSchema } from '@korix/zod-schema';
import { zodOpenApiPlugin } from '@korix/zod-openapi-plugin';
import { scalarUiPlugin } from '@korix/openapi-scalar-ui-plugin';
import { z } from 'zod';

const CreateUserSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(0).optional(),
});

const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
})
  // Generate OpenAPI specification from Zod schemas
  .applyPlugin(
    zodOpenApiPlugin({
      info: { title: 'My API', version: '1.0.0' },
    }),
  )
  // Serve interactive documentation UI
  .applyPlugin(scalarUiPlugin());

app.post('/users', {
  requestSchema: zodRequestSchema({ body: CreateUserSchema }),
  handler: (ctx) => {
    // Type-safe validated body access
    const { name, age } = ctx.req.validatedBody();

    // Your business logic here (save to database, etc.)

    return ctx.res.status(201).json({
      id: Math.random().toString(36),
      name,
      age,
      createdAt: new Date().toISOString(),
    });
  },
});

export { app };
```

Visit `http://localhost:3000/docs` for interactive documentation!

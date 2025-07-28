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
  const { id } = ctx.req.pathParams;
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

## Hooks

Add initialization and request lifecycle processing:

```typescript
import { createKori } from '@korix/kori';

const app = createKori()
  .onInit(async (ctx) => {
    // Runs once when application starts
    app.log().info('Application starting...');
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

app.get('/hello1', (ctx) => {
  // Type-safe access to environment extensions
  const uptime = Date.now() - ctx.env.applicationStartTime.getTime();
  return ctx.res.text(`Hello from endpoint 1! Uptime: ${uptime}ms`);
});

app.get('/hello2', (ctx) => {
  return ctx.res.text('Hello from endpoint 2!');
});

export { app };
```

## Plugins

Extend functionality with reusable plugins:

```typescript
import { createKori } from '@korix/kori';
import { corsPlugin } from '@korix/cors-plugin';

const app = createKori().applyPlugin(
  corsPlugin({
    origin: ['http://localhost:3000', 'https://myapp.com'],
    credentials: true,
  }),
);

app.get('/api/data', (ctx) => {
  return ctx.res.json({ message: 'CORS enabled!' });
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
  email: z.string().email(),
  age: z.number().min(18).optional(),
});

const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
});

app.post('/users', {
  requestSchema: zodRequestSchema({ body: CreateUserSchema }),
  handler: (ctx) => {
    // Type-safe validated body access
    const { name, email, age } = ctx.req.validated.body;

    // Your business logic here (save to database, etc.)

    return ctx.res.status(201).json({
      id: Math.random().toString(36),
      name,
      email,
      age,
      createdAt: new Date().toISOString(),
    });
  },
});

export { app };
```

## OpenAPI

Generate interactive API documentation:

```typescript
import { createKori } from '@korix/kori';
import { createKoriZodRequestValidator } from '@korix/zod-validator';
import { zodRequestSchema } from '@korix/zod-schema';
import { zodOpenApiPlugin } from '@korix/zod-openapi-plugin';
import { scalarUiPlugin } from '@korix/openapi-scalar-ui-plugin';
import { z } from 'zod';

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(18).optional(),
});

const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
})
  // Generate OpenAPI specification from Zod schemas
  .applyPlugin(zodOpenApiPlugin({ info: { title: 'My API', version: '1.0.0' } }))
  // Serve interactive documentation UI
  .applyPlugin(scalarUiPlugin());

app.post('/users', {
  requestSchema: zodRequestSchema({ body: CreateUserSchema }),
  handler: (ctx) => {
    // Type-safe validated body access
    const { name, email, age } = ctx.req.validated.body;

    // Your business logic here (save to database, etc.)

    return ctx.res.status(201).json({
      id: Math.random().toString(36),
      name,
      email,
      age,
      createdAt: new Date().toISOString(),
    });
  },
});

export { app };
```

Visit `http://localhost:3000/docs` for interactive documentation!

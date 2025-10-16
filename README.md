# Kori

A modern, type-safe web framework for TypeScript, built on [Hono](https://hono.dev/)'s battle-tested router.

## Features

- Fast and lightweight routing powered by Hono's router
- TypeScript type inference throughout your application
- Request and response validation with Zod schemas
- OpenAPI specification generation from Zod schemas
- Extensible plugin architecture

Kori also supports Standard Schema for validation with other schema libraries.

## Hello, Kori!

Here's an example with Node.js:

```bash
npm install @korix/kori @korix/nodejs-server
```

```typescript
import { createKori } from '@korix/kori';
import { startNodejsServer } from '@korix/nodejs-server';

const app = createKori();

app.get('/greeting', (ctx) => {
  return ctx.res.json({ message: 'Hello, Kori!' });
});

await startNodejsServer(app, { port: 3000 });
```

These examples use [HTTPie](https://httpie.io/), but feel free to use any other tool you prefer.

```bash
❯ http -b localhost:3000/greeting
{
    "message": "Hello, Kori!"
}
```

## With PathParams

You can use path parameters to create dynamic routes:

```typescript
const app = createKori();

app.get('/greeting', (ctx) => {
  return ctx.res.json({ message: 'Hello, Kori!' });
});

// With path parameter
app.get('/greeting/:name', (ctx) => {
  const { name } = ctx.req.pathParams();
  return ctx.res.json({ message: `Hello, ${name}!` });
});
```

```bash
❯ http -b localhost:3000/greeting/world
{
    "message": "Hello, world!"
}
```

## With onRequest Hook

The `onRequest` hook lets you run logic before and after request handling:

```typescript
const app = createKori().onRequest((ctx) => {
  // Before handler execution
  ctx.log().info('Request started');
  ctx.defer((ctx) => {
    // After handler execution
    ctx.log().info('Request finished');
  });
});

app.get('/greeting', (ctx) => {
  ctx.log().info('Processing greeting request');
  return ctx.res.json({ message: 'Hello, Kori!' });
});
```

```bash
❯ http -b localhost:3000/greeting
{
    "message": "Hello, Kori!"
}
```

Server log output:

```bash
2025-10-16T14:33:59.683Z INFO  [app:request] Request started
2025-10-16T14:33:59.683Z INFO  [app:request] Processing greeting request
2025-10-16T14:33:59.683Z INFO  [app:request] Request finished
```

## With Request Validation

Let's create a user API with request validation:

```bash
npm install @korix/zod-schema-adapter zod
```

```typescript
import { createKori } from '@korix/kori';
import { startNodejsServer } from '@korix/nodejs-server';
import { zodRequestSchema, enableZodRequestValidation } from '@korix/zod-schema-adapter';
import { z } from 'zod';

const app = createKori({
  ...enableZodRequestValidation(),
});

app.post('/users', {
  requestSchema: zodRequestSchema({
    body: z.object({
      name: z.string(),
      age: z.number(),
    }),
  }),
  handler: (ctx) => {
    const { name, age } = ctx.req.validatedBody();
    return ctx.res.status(201).json({ id: 1, name, age });
  },
});

await startNodejsServer(app, { port: 3000 });
```

Valid request with correct types:

```bash
❯ http -b POST http://localhost:3000/users name=Mitz age:=45
{
    "age": 45,
    "id": 1,
    "name": "Mitz"
}
```

Invalid request with wrong type:

```bash
❯ http -b POST http://localhost:3000/users name=Mitz age=SHIIBA
{
    "error": {
        "message": "Request validation failed",
        "type": "BAD_REQUEST"
    }
}
```

## With Response Validation

You can also add response schema validation to catch unexpected responses. By default, validation failures are only logged and the response is still returned:

```typescript
import { createKori } from '@korix/kori';
import { startNodejsServer } from '@korix/nodejs-server';
import { zodRequestSchema, zodResponseSchema, enableZodRequestAndResponseValidation } from '@korix/zod-schema-adapter';
import { z } from 'zod';

const app = createKori({
  ...enableZodRequestAndResponseValidation(),
});

app.post('/users', {
  requestSchema: zodRequestSchema({
    body: z.object({
      name: z.string(),
      age: z.number(),
    }),
  }),
  responseSchema: zodResponseSchema({
    '201': z.object({
      id: z.number(),
      name: z.string(),
      age: z.number(),
    }),
  }),
  handler: (ctx) => {
    const { name, age } = ctx.req.validatedBody();
    // Intentionally return invalid response for demonstration
    if (name === 'invalid') {
      return ctx.res.status(201).json({ id: 1, name });
    }
    return ctx.res.status(201).json({ id: 1, name, age });
  },
});

await startNodejsServer(app, { port: 3000 });
```

Valid response:

```bash
❯ http -b POST http://localhost:3000/users name=Mitz age:=45
{
    "age": 45,
    "id": 1,
    "name": "Mitz"
}
```

Invalid response (missing age field) is still returned as-is:

```bash
❯ http POST http://localhost:3000/users name=invalid age:=45
HTTP/1.1 201 Created
... (other headers omitted)

{
    "id": 1,
    "name": "invalid"
}
```

Server log output:

```
2025-10-15T02:13:34.470Z INFO  [sys:request] Response validation failed {
  "type": "response-validation",
  "err": {
    "body": {
      "stage": "validation",
      "reason": {
        "provider": "zod",
        "type": "Validation",
        "message": "Validation error",
        "issues": [
          {
            "expected": "number",
            "code": "invalid_type",
            "path": ["age"],
            "message": "Invalid input: expected number, received undefined"
          }
        ]
      }
    }
  }
}
```

## And OpenAPI

Generate OpenAPI documentation from your validation schemas:

```bash
npm install @korix/zod-openapi-plugin @korix/openapi-swagger-ui-plugin
```

```typescript
import { createKori } from '@korix/kori';
import { startNodejsServer } from '@korix/nodejs-server';
import { swaggerUiPlugin } from '@korix/openapi-swagger-ui-plugin';
import { zodOpenApiPlugin } from '@korix/zod-openapi-plugin';
import { zodRequestSchema, zodResponseSchema, enableZodRequestAndResponseValidation } from '@korix/zod-schema-adapter';
import { z } from 'zod';

const app = createKori({
  ...enableZodRequestAndResponseValidation(),
})
  .applyPlugin(zodOpenApiPlugin({ info: { title: 'My API', version: '1.0.0' } }))
  .applyPlugin(swaggerUiPlugin());

app.post('/users', {
  requestSchema: zodRequestSchema({
    body: z.object({
      name: z.string(),
      age: z.number(),
    }),
  }),
  responseSchema: zodResponseSchema({
    '201': z.object({
      id: z.number(),
      name: z.string(),
      age: z.number(),
    }),
  }),
  handler: (ctx) => {
    const { name, age } = ctx.req.validatedBody();
    return ctx.res.status(201).json({ id: 1, name, age });
  },
});

await startNodejsServer(app, { port: 3000 });
```

Now you can visit http://localhost:3000/docs for interactive API documentation.

![Swagger UI](readme-img/swagger-ui.png)

## Documentation

📖 [Read the full documentation](https://bufferings.github.io/kori)

## Packages

- [`@korix/kori`](./packages/kori) - Core framework
- [`@korix/nodejs-server`](./packages/nodejs-server) - Node.js HTTP server adapter
- [`@korix/zod-schema-adapter`](./packages/zod-schema-adapter) - Zod schema adapter for request and response validation
- [`@korix/zod-openapi-plugin`](./packages/zod-openapi-plugin) - OpenAPI document generation from Zod schemas
- [`@korix/openapi-swagger-ui-plugin`](./packages/openapi-swagger-ui-plugin) - Interactive API documentation with Swagger UI

[View all packages →](./packages)

## License

MIT

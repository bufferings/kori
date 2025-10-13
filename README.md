# Kori

A modern, type-safe web framework for TypeScript, built on [Hono](https://hono.dev/)'s battle-tested router.

## Features

- Fast and lightweight routing powered by Hono's router
- Full TypeScript type inference throughout your application
- Automatic OpenAPI specification generation
- Schema validation with Zod and other libraries
- Extensible plugin architecture

## Installation

```bash
npm install @korix/kori
```

## Quick Example

```typescript
import { createKori } from '@korix/kori';

const app = createKori()
  .get('/hello/:name', (ctx) => {
    const { name } = ctx.req.pathParams();
    return ctx.res.json({ message: `Hello, ${name}!` });
  })
  .post('/users', async (ctx) => {
    const body = await ctx.req.bodyJson();
    return ctx.res.status(201).json({ id: 1, ...body });
  });

// Generate the fetch handler
const { fetchHandler } = await app.generate().onStart();

// Use with any platform that supports Fetch API
const response = await fetchHandler(new Request('http://localhost/hello/world'));
```

## With Validation

```typescript
import { createKori } from '@korix/kori';
import { zodRequestSchema, zodResponseSchema, enableZodRequestValidation } from '@korix/zod-schema-adapter';
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
  responseSchema: zodResponseSchema({
    201: z.object({
      id: z.number(),
      name: z.string(),
      age: z.number(),
    }),
  }),
  handler: (ctx) => {
    // Types are automatically inferred from schemas
    const { name, age } = ctx.req.validatedBody();
    return ctx.res.status(201).json({ id: 1, name, age });
  },
});
```

## And OpenAPI

```typescript
import { createKori } from '@korix/kori';
import { zodOpenApiPlugin, openApiMeta } from '@korix/zod-openapi-plugin';
import { swaggerUiPlugin } from '@korix/openapi-swagger-ui-plugin';
import { startNodejsServer } from '@korix/nodejs-server';

const app = createKori()
  .applyPlugin(
    zodOpenApiPlugin({
      info: { title: 'My API', version: '1.0.0' },
    }),
  )
  .applyPlugin(swaggerUiPlugin())
  .get('/hello/:name', {
    pluginMeta: openApiMeta({
      summary: 'Say hello',
      description: 'Returns a personalized greeting',
      tags: ['Greetings'],
    }),
    handler: (ctx) => {
      const { name } = ctx.req.pathParams();
      return ctx.res.json({ message: `Hello, ${name}!` });
    },
  });

await startNodejsServer(app, { port: 3000 });

// Visit http://localhost:3000/docs for interactive API documentation
```

## Documentation

📖 [Read the full documentation](https://bufferings.github.io/kori)

## Packages

- [`@korix/kori`](./packages/kori) - Core framework
- [`@korix/zod-openapi-plugin`](./packages/zod-openapi-plugin) - Zod schema validation with OpenAPI generation
- [`@korix/openapi-swagger-ui-plugin`](./packages/openapi-swagger-ui-plugin) - Interactive API documentation with Swagger UI
- [`@korix/nodejs-server`](./packages/nodejs-server) - Node.js HTTP server adapter

[View all packages →](./packages)

## Built With

Kori is built on top of excellent open source projects:

- [Hono Router](https://hono.dev/) - Fast, lightweight, and battle-tested routing engine
- [Swagger UI](https://swagger.io/tools/swagger-ui/) - Interactive API documentation

## License

MIT

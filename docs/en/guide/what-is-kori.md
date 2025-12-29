# What is Kori?

Kori - means ice 🧊 (氷) in Japanese - is a TypeScript web framework that brings cool, type-safety-first development.

Start simple, then use type-safe features as you need them.

## Start Simple

```typescript
import { createKori } from '@korix/kori';

const app = createKori();

app.get('/', (ctx) => {
  return ctx.res.json({ message: 'Hello Kori!' });
});
```

## Type-Safe Context

Extend your application environment with full type safety:

```typescript
import { createKori } from '@korix/kori';

const app = createKori().onStart(async (ctx) => {
  const config = { apiVersion: 'v1' };

  // Type-safe environment extensions
  return ctx.withEnv({ config });
});

app.get('/status', (ctx) => {
  // Fully typed environment access
  const version = ctx.env.config.apiVersion;
  return ctx.res.json({ version, status: 'healthy' });
});
```

## Type-Safe Validation

Define schemas once, get validation and types automatically:

```typescript
import { createKori } from '@korix/kori';
import { stdRequestSchema, enableStdRequestValidation } from '@korix/std-schema-adapter';
import { z } from 'zod';

const app = createKori({
  ...enableStdRequestValidation(),
});

app.post('/users', {
  requestSchema: stdRequestSchema({
    body: z.object({
      name: z.string().min(1),
      age: z.number().int().min(0),
    }),
  }),
  handler: (ctx) => {
    // Fully typed and validated - no casting needed!
    const { name, age } = ctx.req.validatedBody();
    return ctx.res.json({ id: '123', name, age });
  },
});
```

## Same Schema, OpenAPI Documentation

With the OpenAPI plugin, your validation schemas become OpenAPI documentation:

```typescript
import { createKori } from '@korix/kori';
import { stdRequestSchema, stdResponseSchema, enableStdRequestAndResponseValidation } from '@korix/std-schema-adapter';
import { stdSchemaOpenApiPlugin } from '@korix/std-schema-openapi-plugin';
import { swaggerUiPlugin } from '@korix/openapi-swagger-ui-plugin';
import { z } from 'zod';

const app = createKori({
  ...enableStdRequestAndResponseValidation(),
})
  .applyPlugin(
    stdSchemaOpenApiPlugin({ info: { title: 'My API', version: '1.0.0' } }),
  )
  .applyPlugin(swaggerUiPlugin());

app.post('/users', {
  requestSchema: stdRequestSchema({
    body: z.object({
      name: z.string(),
      age: z.number(),
    }),
  }),
  responseSchema: stdResponseSchema({
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
```

Now you can visit http://localhost:3000/docs for interactive API documentation.

![Swagger UI](/swagger-ui.png)

## Powered by Hono Router

Last but not least, Kori integrates Hono's battle-tested router. This means fast routing performance and reliability.

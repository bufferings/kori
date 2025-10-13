# What is Kori?

Kori - means ice 🧊 (氷) in Japanese - is a TypeScript web framework that brings cool, type-safety-first development.

Start simple, then use type-safe features as you need them.

## Start Simple

```typescript
const app = createKori();

app.get('/', (ctx) => {
  return ctx.res.json({ message: 'Hello Kori!' });
});
```

## Type-Safe Context

Extend your application environment with full type safety:

```typescript
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
const app = createKori({
  ...enableZodRequestValidation(),
});

app.post('/users', {
  requestSchema: zodRequestSchema({
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
const app = createKori({
  ...enableZodRequestValidation(),
})
  .applyPlugin(
    zodOpenApiPlugin({
      info: { title: 'My API', version: '1.0.0' },
    }),
  )
  .applyPlugin(swaggerUiPlugin());

app.post('/users', {
  requestSchema: zodRequestSchema({
    body: z.object({
      name: z.string().min(1),
      age: z.number().int().min(0),
    }),
  }),
  responseSchema: zodResponseSchema({
    '200': z.object({
      id: z.string(),
      name: z.string(),
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

[Image placeholder: Interactive OpenAPI documentation generated from UserSchema]

## Powered by Hono Router

Last but not least, Kori integrates Hono's battle-tested router. This means fast routing performance and reliability.

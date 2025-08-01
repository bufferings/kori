# What is Kori?

Kori - means ice 🧊 (氷) in Japanese - is a TypeScript web framework that brings cool, type-safety-first development.

Start simple, then use type-safe features as you need them.

## Start Simple

```typescript
app.get('/', (ctx) => {
  return ctx.res.json({ message: 'Hello Kori!' });
});
```

## Type-Safe Context

Extend your application environment with full type safety:

```typescript
const app = createKori().onInit(async (ctx) => {
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
const UserSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
});

app.post('/users', {
  requestSchema: zodRequestSchema({ body: UserSchema }),
  handler: (ctx) => {
    // Fully typed and validated - no casting needed!
    const { name, email } = ctx.req.validatedBody();
    return ctx.res.json({ id: '123', name, email });
  },
});
```

## Same Schema, OpenAPI Documentation

With the OpenAPI plugin, your validation schemas become OpenAPI documentation:

[Image placeholder: Interactive OpenAPI documentation generated from UserSchema]

## Powered by Hono Router

Last but not least, Kori integrates Hono's battle-tested router. This means fast routing performance and reliability.

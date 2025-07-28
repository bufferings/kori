# What is Kori?

Kori - means ice 🧊 (氷) in Japanese - is a TypeScript-first web application framework that brings cool, structured clarity to API development.

Build type-safe APIs where your schemas define both validation and TypeScript types.

## Start Simple

```typescript
app.get('/', (ctx) => {
  return ctx.res.json({ message: 'Hello Kori!' });
});
```

## Add Schemas for More Power

```typescript
import { zodRequestSchema } from '@korix/zod-schema';

const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

app.post('/users', {
  requestSchema: zodRequestSchema({ body: UserSchema }),
  handler: (ctx) => {
    // Validated and typed from schema
    const { name, email } = ctx.req.validated.body;
    return ctx.res.json({ id: '123', name, email });
  },
});
```

One schema provides validation and TypeScript types. Add OpenAPI plugins to generate documentation from the same schemas.

## Powered by Hono Router

Under the hood, Kori integrates Hono's battle-tested router while adding TypeScript-first schema validation and type safety on top.

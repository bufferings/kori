# What is Kori?

Kori is a TypeScript-first web application framework that makes building APIs feel natural.

Build type-safe APIs where your schemas define both validation and TypeScript types.

---

## Start Simple

```typescript
app.get('/', (ctx) => {
  return ctx.res.json({ message: 'Hello Kori!' });
});
```

---

## Add Schemas for More Power

```typescript
const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

app.post('/users', {
  request: { body: UserSchema },
  handler: (ctx) => {
    // Validated and typed from schema
    const { name, email } = ctx.req.validated.body;
    return ctx.res.json({ id: '123', name, email });
  },
});
```

One schema provides validation and TypeScript types. Add OpenAPI plugins to generate documentation from the same schemas.

---

[Getting Started →](/en/guide/getting-started)

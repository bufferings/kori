# Zod Validation

**Runtime validation powered by Zod schemas.**

The `@korix/zod-validator` package provides runtime validation capabilities using the schemas you define with `@korix/zod-schema`.

> **Prerequisites:** Make sure you're familiar with [Zod Schema](/en/extensions/zod-schema) before diving into validation.

## Quick Overview

Zod Validation brings your schemas to life with:

- ✅ **Runtime Safety** - Validate incoming requests automatically
- 🔒 **Type Inference** - Get full TypeScript types from validated data
- 📝 **Detailed Errors** - Clear, actionable validation error messages
- ⚡ **Performance** - Optimized validation with smart caching

## Basic Setup

```typescript
import { createKori } from '@korix/kori';
import { createKoriZodRequestValidator } from '@korix/zod-validator';

const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
});
```

## Request Validation

### Body Validation

Validate JSON request bodies:

```typescript
import { zodRequestSchema } from '@korix/zod-schema';
import { z } from 'zod/v4';

const UserCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(18).optional(),
});

app.post('/users', {
  requestSchema: zodRequestSchema({
    body: UserCreateSchema,
  }),
  handler: (ctx) => {
    // ctx.req.validatedBody() is fully typed!
    const { name, email, age } = ctx.req.validatedBody();

    // TypeScript knows the exact types:
    // name: string
    // email: string
    // age: number | undefined

    return ctx.res.json({ user: { name, email, age } });
  },
});
```

### Query Parameter Validation

Validate and transform query parameters:

```typescript
const SearchSchema = z.object({
  q: z.string().min(1).meta({ description: 'Search query' }),
  category: z.enum(['electronics', 'books', 'clothing']).optional(),
  minPrice: z
    .string()
    .regex(/^\d+(\.\d{2})?$/)
    .transform(Number)
    .optional(),
  maxPrice: z
    .string()
    .regex(/^\d+(\.\d{2})?$/)
    .transform(Number)
    .optional(),
  tags: z.string().optional().meta({ description: 'Comma-separated tags' }),
  sort: z.enum(['name', 'price', 'created']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

app.get('/products/search', {
  requestSchema: zodRequestSchema({
    queries: SearchSchema,
  }),
  handler: (ctx) => {
    const query = ctx.req.validatedQueries();

    // Automatic type conversion and defaults:
    // q: string
    // category: 'electronics' | 'books' | 'clothing' | undefined
    // minPrice: number | undefined (transformed from string)
    // sort: 'name' | 'price' | 'created' (defaults to 'name')

    return ctx.res.json({
      query: query.q,
      filters: {
        category: query.category,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
      },
      sorting: { sort: query.sort, order: query.order },
    });
  },
});
```

### Path Parameter Validation

Validate and transform path parameters:

```typescript
const UserParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

app.get('/users/:id', {
  requestSchema: zodRequestSchema({
    pathParams: UserParamsSchema,
  }),
  handler: (ctx) => {
    const { id } = ctx.req.validatedParams();
    // id: number (transformed from string)

    return ctx.res.json({ userId: id });
  },
});
```

### Header Validation

Validate required headers:

```typescript
const AuthHeaderSchema = z.object({
  authorization: z.string().regex(/^Bearer .+$/),
  'x-api-version': z.enum(['v1', 'v2']).default('v1'),
});

app.get('/protected', {
  requestSchema: zodRequestSchema({
    headers: AuthHeaderSchema,
  }),
  handler: (ctx) => {
    const { authorization, 'x-api-version': apiVersion } =
      ctx.req.validatedHeaders();
    const token = authorization.replace('Bearer ', '');

    return ctx.res.json({ authenticated: true, apiVersion });
  },
});
```

## Response Validation

Validate responses in development:

```typescript
import { createKoriZodResponseValidator } from '@korix/zod-validator';
import { zodResponseSchema } from '@korix/zod-schema';

const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
  responseValidator: createKoriZodResponseValidator(), // Add this
});

const UserResponseSchema = z.object({
  user: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }),
});

app.post('/users', {
  requestSchema: zodRequestSchema({ body: UserCreateSchema }),
  responseSchema: zodResponseSchema({
    201: UserResponseSchema,
  }),
  handler: (ctx) => {
    const userData = ctx.req.validatedBody();

    // Response will be validated in development
    return ctx.res.status(201).json({
      user: { id: 123, name: userData.name, email: userData.email },
    });
  },
});
```

## Error Handling

### Validation Errors

Handle validation errors gracefully:

```typescript
const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
  responseValidator: createKoriZodResponseValidator(),
});

// Route-level validation error handling
app.post('/validation-demo', {
  requestSchema: zodRequestSchema({
    body: z.object({
      email: z.string().email(),
      age: z.number().min(18).max(120),
      preferences: z.object({
        newsletter: z.boolean(),
        theme: z.enum(['light', 'dark']),
      }),
    }),
  }),
  onRequestValidationError: (ctx, errors) => {
    // Log error details for debugging
    ctx.req.log().warn('Validation failed', {
      errors,
      path: ctx.req.url().pathname,
      method: ctx.req.method(),
    });

    // Return user-friendly error
    return ctx.res.badRequest({
      message: 'Validation failed',
      details: errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  },
  handler: (ctx) => {
    const { email, age, preferences } = ctx.req.validatedBody();
    return ctx.res.json({
      message: 'Success!',
      user: { email, age, preferences },
    });
  },
});
```

### Custom Error Messages

Provide helpful error messages:

```typescript
const UserSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Please enter a valid email address'),
  age: z
    .number()
    .min(18, 'Must be at least 18 years old')
    .max(120, 'Age seems unrealistic'),
});
```

## Advanced Patterns

### Conditional Validation

Validate differently based on context:

```typescript
const CreateOrUpdateSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create'),
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8), // Required for creation
  }),
  z.object({
    action: z.literal('update'),
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    // Password not required for updates
  }),
]);
```

### Custom Validation

Add custom validation logic:

```typescript
const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain uppercase, lowercase, and number',
  );
```

## Performance Tips

### Schema Caching

Schemas are automatically cached for performance:

```typescript
// This schema is compiled once and reused
const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

// Multiple routes can share the same schema efficiently
app.post('/users', { requestSchema: zodRequestSchema({ body: UserSchema }) });
app.put('/users/:id', {
  requestSchema: zodRequestSchema({ body: UserSchema }),
});
```

### Lazy Validation

Only validate what you need:

```typescript
const ConditionalSchema = z.object({
  type: z.enum(['simple', 'complex']),
  data: z.unknown(), // Validate later based on type
});

app.post('/process', {
  requestSchema: zodRequestSchema({ body: ConditionalSchema }),
  handler: (ctx) => {
    const { type, data } = ctx.req.validatedBody();

    if (type === 'simple') {
      const simpleData = z.string().parse(data);
      return ctx.res.json({ processed: simpleData.toUpperCase() });
    } else {
      const complexData = z.array(z.string()).parse(data);
      return ctx.res.json({ count: complexData.length });
    }
  },
});
```

## Next Steps

- **[Zod OpenAPI Plugin](/en/extensions/zod-openapi-plugin)** - Generate documentation from your validated schemas
- **[Error Handling Guide](/en/guide/error-handling)** - Advanced error handling patterns
- **[Examples](/en/examples/)** - See validation in action with real applications

---

**Note:** This documentation is currently being developed. More detailed examples and patterns will be added soon.

# Validation

Validation is one of Kori's strongest features. Built-in Zod integration provides **type-safe, runtime validation** with automatic type generation - no casting required.

> Coming from Getting Started? Perfect! This is where Kori really shines. You'll turn your simple API into a bulletproof, type-safe powerhouse. 🚀

## Why Kori's Validation Stands Out

**🔒 Complete Type Safety**: TypeScript knows your validated data types automatically - zero `as` statements needed.

**⚡ Zero Overhead**: Routes without validation have zero performance cost. Smart content-type handling and efficient parsing.

**🎯 One Source of Truth**: Schemas define both validation and types. Change once, update everywhere.

## Quick Start

Install the Zod integration packages:

```bash
npm install @korix/zod-validator @korix/zod-schema zod
```

Set up your Kori application with validation:

```typescript
import { createKori, HttpStatus } from '@korix/kori';
import { createKoriZodRequestValidator } from '@korix/zod-validator';
import { zodRequestSchema } from '@korix/zod-schema';
import { z } from 'zod/v4';

const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
});
```

## Basic Example

Here's how validation transforms your API development:

```typescript
// Define your data structure
const UserCreateSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().min(18).max(120).optional(),
});

// Use it in your API
app.post('/users', {
  requestSchema: zodRequestSchema({
    body: UserCreateSchema,
  }),
  handler: (ctx) => {
    // Fully typed and validated! ✨
    const { name, email, age } = ctx.req.validatedBody();

    return ctx.res.status(HttpStatus.CREATED).json({
      user: { name, email, age },
      message: 'User created successfully!',
    });
  },
});
```

**What happens automatically:**

- ✅ Request body is parsed and validated
- ✅ TypeScript types are inferred from schema
- ✅ Validation errors return helpful messages
- ✅ Invalid requests are rejected before reaching your handler

## Core Validation Concepts

### Schema-First Development

```typescript
// Schema defines everything
const ProductSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  category: z.enum(['electronics', 'books', 'clothing']),
});

// Types are automatically generated
type Product = z.infer<typeof ProductSchema>;
// { name: string; price: number; category: 'electronics' | 'books' | 'clothing' }

// Use in multiple places
const requestSchema = zodRequestSchema({ body: ProductSchema });
const responseSchema = zodResponseSchema({ 201: ProductSchema });
```

### Request Parts Validation

Kori can validate any part of the HTTP request:

```typescript
app.get('/users/:id', {
  requestSchema: zodRequestSchema({
    pathParams: z.object({ id: z.string().regex(/^\d+$/).transform(Number) }),
    queries: z.object({ include: z.string().optional() }),
    headers: z.object({ authorization: z.string() }),
  }),
  handler: (ctx) => {
    // All parts are validated and typed
    const { id } = ctx.req.validatedParams(); // number
    const { include } = ctx.req.validatedQueries(); // string | undefined
    const { authorization } = ctx.req.validatedHeaders(); // string
  },
});
```

### Automatic Error Handling

Validation errors are handled automatically with clear, actionable messages:

```json
{
  "error": "Validation Error",
  "details": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "string",
      "message": "String must contain at least 1 character(s)",
      "path": ["name"]
    },
    {
      "code": "invalid_type",
      "expected": "number",
      "received": "string",
      "message": "Expected number, received string",
      "path": ["age"]
    }
  ]
}
```

## Integration with OpenAPI

Your validation schemas automatically power API documentation:

```typescript
import { zodOpenApiPlugin } from '@korix/zod-openapi-plugin';
import { scalarUiPlugin } from '@korix/openapi-scalar-ui-plugin';

const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
})
  .applyPlugin(
    zodOpenApiPlugin({
      info: { title: 'My API', version: '1.0.0' },
    }),
  )
  .applyPlugin(scalarUiPlugin({ path: '/docs' }));

// Your validated routes automatically get documented!
// Visit http://localhost:3000/docs for interactive documentation
```

## When to Use Validation

**✅ Always use for:**

- Public APIs
- User input processing
- Data persistence
- External service integration

**❓ Consider for:**

- Internal services (still recommended for safety)
- Development and testing environments

**❌ Skip for:**

- Static file serving
- Simple health checks
- High-performance internal endpoints (if type safety isn't critical)

## Best Practices

### Schema Organization

Keep schemas organized and reusable:

```typescript
// schemas/user.ts
export const UserCreateSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

export const UserUpdateSchema = UserCreateSchema.partial();

export const UserResponseSchema = UserCreateSchema.extend({
  id: z.number(),
  createdAt: z.string().datetime(),
});
```

### Progressive Enhancement

Start simple, add complexity as needed:

```typescript
// Start with basic validation
const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

// Evolve with business requirements
const UserSchemaV2 = UserSchema.extend({
  age: z.number().min(18).optional(),
  preferences: z
    .object({
      newsletter: z.boolean().default(false),
      theme: z.enum(['light', 'dark']).default('light'),
    })
    .optional(),
});
```

## Next Steps

### 🔧 Deep Dive into Validation

- **[Zod Schema](/en/extensions/zod-schema)** - Master schema design patterns
- **[Zod Validation](/en/extensions/zod-validation)** - Complete validation API reference
- **[Zod OpenAPI Plugin](/en/extensions/zod-openapi-plugin)** - Generate documentation from schemas

### 📚 Related Guides

- **[OpenAPI Integration](/en/guide/openapi)** - Turn your schemas into beautiful documentation
- **[Error Handling](/en/guide/error-handling)** - Advanced error patterns and recovery
- **[Context](/en/guide/context)** - Master HTTP handling

### 💡 Real Examples

- **[REST API Example](/en/examples/rest-api)** - Complete API with validation
- **[File Upload Example](/en/examples/file-upload)** - Handle complex file validation

### ⚡ Performance & Advanced Topics

For detailed API documentation, advanced patterns, and performance optimization, see the [Extensions documentation](/en/extensions/).

---

**Ready to build bulletproof APIs?** Start with the [Extensions documentation](/en/extensions/zod-schema) for comprehensive guides, or jump into our [examples](/en/examples/) to see validation in action!

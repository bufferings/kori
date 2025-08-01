# Zod Schema

Foundation for type-safe validation and OpenAPI documentation in Kori.

The `@korix/zod-schema` package provides the building blocks for creating schemas that power both validation and automatic documentation generation.

## Why Zod Schema?

Zod Schema is the starting point for Kori's type-safe ecosystem:

- 🏗️ Create reusable, composable schemas
- 🔗 Automatic TypeScript type generation
- 📋 Use same schemas for validation AND OpenAPI docs
- ⚡ Optimized schema compilation and caching

## Basic Usage

```typescript
import { zodRequestSchema, zodResponseSchema } from '@korix/zod-schema';
import { z } from 'zod';

// Define your schema
const UserSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(0),
});

// Use in request schema
const requestSchema = zodRequestSchema({
  body: UserSchema,
});

// Use in response schema
const responseSchema = zodResponseSchema({
  201: UserSchema,
  400: z.object({ error: z.string() }),
});
```

## Core Concepts

### Request Schemas

Request schemas define the structure of incoming data:

```typescript
import { zodRequestSchema } from '@korix/zod-schema';

const requestSchema = zodRequestSchema({
  body: UserCreateSchema,
  queries: SearchParamsSchema,
  pathParams: UserParamsSchema,
  headers: AuthHeaderSchema,
});
```

### Response Schemas

Response schemas define the structure of outgoing data:

```typescript
import { zodResponseSchema } from '@korix/zod-schema';

const responseSchema = zodResponseSchema({
  200: SuccessResponseSchema,
  400: ValidationErrorSchema,
  404: NotFoundErrorSchema,
  500: InternalErrorSchema,
});
```

### Schema Composition

Build complex schemas from simpler ones:

```typescript
const BaseUserSchema = z.object({
  name: z.string(),
  age: z.number().int().min(0),
});

const UserCreateSchema = BaseUserSchema.extend({
  password: z.string().min(8),
});

const UserResponseSchema = BaseUserSchema.extend({
  id: z.number(),
  createdAt: z.iso.datetime(),
});
```

## Common Patterns

### Transformations

Transform data during schema validation:

```typescript
const QuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  tags: z.string().transform((str) => str.split(',').map((s) => s.trim())),
});
```

### Optional Fields with Defaults

Handle optional data gracefully:

```typescript
const ConfigSchema = z.object({
  enabled: z.boolean().default(true),
  retries: z.number().min(0).default(3),
  timeout: z.number().min(1000).optional(),
});
```

### Nested Objects

Structure complex data hierarchies:

```typescript
const OrderSchema = z.object({
  customer: z.object({
    name: z.string(),
    age: z.number().int().min(0),
  }),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().min(1),
        price: z.number().positive(),
      }),
    )
    .min(1),
});
```

## Best Practices

### Schema Organization

Keep schemas organized and reusable:

```typescript
// schemas/user.ts
export const UserCreateSchema = z.object({
  name: z.string().min(1).max(100),
  age: z.number().int().min(0),
});

export const UserUpdateSchema = UserCreateSchema.partial();

export const UserResponseSchema = UserCreateSchema.extend({
  id: z.number(),
  createdAt: z.iso.datetime(),
});
```

### Type Extraction

Extract TypeScript types from schemas:

```typescript
type UserCreate = z.infer<typeof UserCreateSchema>;
type UserResponse = z.infer<typeof UserResponseSchema>;

// Use in business logic
async function createUser(data: UserCreate): Promise<UserResponse> {
  // Implementation
}
```

### Documentation Metadata

Add rich metadata for better documentation:

```typescript
const UserSchema = z.object({
  name: z.string().min(1).meta({
    description: 'User full name',
    example: 'John Doe',
  }),
  age: z.number().int().min(0).meta({
    description: 'User age',
    example: 30,
  }),
});
```

## Next Steps

Now that you understand schema design, explore how to use them:

- **[Zod Validation](/en/extensions/zod-validation)** - Use schemas for runtime validation
- **[Zod OpenAPI Plugin](/en/extensions/zod-openapi-plugin)** - Generate documentation from schemas
- **[Examples](/en/examples/)** - See schemas in action with real applications

---

**Note:** This documentation is currently being developed. More detailed examples and patterns will be added soon.

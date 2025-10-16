# @korix/zod-openapi-plugin

OpenAPI 3.1 document generation plugin for Kori framework with Zod schema support.

This plugin is a convenience wrapper around [@korix/openapi-plugin](../openapi-plugin) that automatically configures Zod schema conversion for OpenAPI documentation.

## Features

- Automatic OpenAPI 3.1.0 document generation from Zod schemas
- Built-in Zod to OpenAPI schema conversion
- All features from [@korix/openapi-plugin](../openapi-plugin)
- Type-safe request/response schemas with Zod

## Schema Conversion Limitations

This plugin converts Zod schemas to OpenAPI using `toJSONSchema()`. Some types like `z.transform()`, `z.date()`, `z.bigint()`, `z.map()`, `z.set()` cannot be converted. Use alternative schemas instead.

For details, see [Zod's JSON Schema documentation](https://zod.dev/json-schema?id=unrepresentable).

## Installation

You need to install this plugin along with a schema adapter. This plugin only supports Zod schemas.

Option 1: Using @korix/zod-schema-adapter (recommended)

```bash
npm install @korix/kori zod @korix/zod-schema-adapter @korix/zod-openapi-plugin
```

Option 2: Using @korix/standard-schema-adapter

```bash
npm install @korix/kori @standard-schema/spec zod @korix/standard-schema-adapter @korix/zod-openapi-plugin
```

Note: While @korix/standard-schema-adapter supports multiple validation libraries (Zod, Valibot, ArkType, etc.), this plugin only generates OpenAPI documentation from Zod schemas.

## Quick Start

The following example uses @korix/zod-schema-adapter:

```typescript
import { createKori } from '@korix/kori';
import { zodOpenApiPlugin, openApiMeta } from '@korix/zod-openapi-plugin';
import { zodRequestSchema, zodResponseSchema } from '@korix/zod-schema-adapter';
import { z } from 'zod';

const app = createKori()
  .applyPlugin(
    zodOpenApiPlugin({
      info: {
        title: 'My API',
        version: '1.0.0',
        description: 'API documentation with Zod schemas',
      },
    }),
  )
  .get('/users/:id', {
    requestSchema: zodRequestSchema({
      params: z.object({
        id: z.string().uuid(),
      }),
    }),
    responseSchema: zodResponseSchema({
      '200': z.object({
        id: z.string().uuid(),
        name: z.string(),
        email: z.string().email(),
      }),
    }),
    pluginMeta: openApiMeta({
      summary: 'Get user by ID',
      description: 'Retrieves a user by their UUID',
      tags: ['users'],
    }),
    handler: (ctx) => {
      const { id } = ctx.req.pathParams();
      return ctx.res.json({
        id,
        name: 'John Doe',
        email: 'john@example.com',
      });
    },
  });

// OpenAPI document available at: GET /openapi.json
```

## Configuration

### Plugin Options

```typescript
zodOpenApiPlugin({
  // Required: API information
  info: {
    title: string;
    version: string;
    description?: string;
    // ... other OpenAPI InfoObject fields
  },

  // Optional: Custom document endpoint path (default: '/openapi.json')
  documentPath?: string;

  // Optional: Server configurations
  servers?: ServerObject[];
})
```

### Route Metadata

Use `openApiMeta()` to add OpenAPI-specific metadata to routes:

```typescript
import { openApiMeta } from '@korix/zod-openapi-plugin';
import { zodRequestSchema, zodResponseSchema } from '@korix/zod-schema-adapter';
import { z } from 'zod';

app.post('/users', {
  requestSchema: zodRequestSchema({
    body: z.object({
      name: z.string(),
      email: z.string().email(),
    }),
  }),
  responseSchema: zodResponseSchema({
    '201': z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    }),
  }),
  pluginMeta: openApiMeta({
    summary: 'Create a new user',
    description: 'Creates a new user account',
    tags: ['users'],
    operationId: 'createUser',
  }),
  handler: (ctx) => {
    const body = ctx.req.validatedBody();
    return ctx.res.status(201).json({
      id: 'user-123',
      ...body,
    });
  },
});
```

## Zod Schema Examples

### Request Schemas

```typescript
import { zodRequestSchema } from '@korix/zod-schema-adapter';
import { z } from 'zod';

// Path parameters with validation
app.get('/posts/:postId/comments/:commentId', {
  requestSchema: zodRequestSchema({
    params: z.object({
      postId: z.string().uuid().meta({ description: 'Post UUID' }),
      commentId: z.string().uuid().meta({ description: 'Comment UUID' }),
    }),
  }),
  handler: (ctx) => {
    const { postId, commentId } = ctx.req.validatedParams();
    return ctx.res.json({ postId, commentId });
  },
});

// Query parameters
app.get('/users', {
  requestSchema: zodRequestSchema({
    query: z.object({
      page: z.coerce.number().min(1).default(1).meta({ description: 'Page number' }),
      limit: z.coerce.number().min(1).max(100).default(10).meta({ description: 'Items per page' }),
      search: z.string().optional().meta({ description: 'Search query' }),
    }),
  }),
  handler: (ctx) => {
    const { page, limit, search } = ctx.req.validatedQuery();
    return ctx.res.json({ page, limit, search });
  },
});

// Request body
app.post('/articles', {
  requestSchema: zodRequestSchema({
    body: z.object({
      title: z.string().min(1).max(200),
      content: z.string(),
      tags: z.array(z.string()).optional(),
      published: z.boolean().default(false),
    }),
  }),
  handler: (ctx) => {
    const article = ctx.req.validatedBody();
    return ctx.res.status(201).json({ id: 'article-123', ...article });
  },
});
```

### Response Schemas

```typescript
import { zodResponseSchema } from '@korix/zod-schema-adapter';
import { z } from 'zod';

// Multiple response status codes
app.get('/users/:id', {
  responseSchema: zodResponseSchema({
    '200': z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().email(),
    }),
    '404': z.object({
      error: z.object({
        type: z.string(),
        message: z.string(),
      }),
    }),
  }),
  handler: (ctx) => {
    const { id } = ctx.req.pathParams();
    // Handler logic...
    return ctx.res.json({ id, name: 'John', email: 'john@example.com' });
  },
});
```

## Zod Schema Metadata

Use `.meta()` to add descriptions and examples to OpenAPI documentation:

```typescript
const userSchema = z.object({
  id: z.string().uuid().meta({ description: 'Unique user identifier' }),
  name: z.string().min(1).meta({
    description: 'User full name',
    example: 'John Doe',
  }),
  email: z.string().email().meta({ description: 'User email address' }),
  age: z
    .number()
    .int()
    .min(0)
    .max(150)
    .meta({
      description: 'User age in years',
      examples: [25, 30, 45],
    }),
  role: z.enum(['admin', 'user', 'guest']).meta({ description: 'User role' }),
});
```

## Difference from @korix/openapi-plugin

This plugin is a convenience wrapper that:

- Automatically includes the Zod schema converter
- Removes the need to manually configure `converters: [createZodSchemaConverter()]`
- Simplifies the setup for Zod-based projects

If you need to use multiple schema libraries or custom converters, use [@korix/openapi-plugin](../openapi-plugin) directly.

## License

MIT

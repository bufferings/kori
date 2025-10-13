# Zod OpenAPI Plugin

**Automatic OpenAPI documentation generation from your Zod schemas.**

The `@korix/zod-openapi-plugin` transforms your existing Zod schemas into beautiful, interactive API documentation with zero maintenance overhead.

> **Prerequisites:** Familiarity with [Zod Schema](/en/extensions/zod-schema) and optionally [Zod Validation](/en/extensions/zod-validation).

## Quick Overview

The Zod OpenAPI Plugin provides:

- 📖 **Auto Documentation** - Generate OpenAPI specs from your schemas
- 🎨 **Interactive UI** - Beautiful documentation with Swagger UI integration
- 🔄 **Zero Maintenance** - Documentation stays in sync with your code
- 🎯 **Type-Safe Metadata** - Rich, validated documentation metadata

## Basic Setup

```typescript
import { createKori } from '@korix/kori';
import { zodOpenApiPlugin, openApiMeta } from '@korix/zod-openapi-plugin';
import { swaggerUiPlugin } from '@korix/openapi-swagger-ui-plugin';
import { zodRequestSchema } from '@korix/zod-schema';

const app = createKori()
  // Generate OpenAPI specification
  .applyPlugin(
    zodOpenApiPlugin({
      info: {
        title: 'My API',
        version: '1.0.0',
        description: 'A beautiful API built with Kori',
      },
    }),
  )
  // Serve interactive documentation
  .applyPlugin(
    swaggerUiPlugin({
      path: '/docs',
      title: 'My API Documentation',
    }),
  );
```

Now visit `http://localhost:3000/docs` for interactive documentation! 🎉

## Schema Documentation

### Basic Schema Metadata

Add rich metadata to your schemas:

```typescript
import { z } from 'zod';

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

### Request Documentation

Document your API endpoints:

```typescript
app.post('/users', {
  requestSchema: zodRequestSchema({
    body: UserSchema,
  }),
  pluginMetadata: openApiMeta({
    summary: 'Create user',
    description: 'Creates a new user account with validation',
    tags: ['Users'],
  }),
  handler: (ctx) => {
    const user = ctx.req.validatedBody();
    return ctx.res.status(201).json({ user });
  },
});
```

### Response Documentation

Document response schemas:

```typescript
import { zodResponseSchema } from '@korix/zod-schema';

const UserResponseSchema = z.object({
  user: UserSchema,
  createdAt: z.iso.datetime(),
});

app.post('/users', {
  requestSchema: zodRequestSchema({ body: UserSchema }),
  responseSchema: zodResponseSchema({
    201: UserResponseSchema,
    400: z.object({ error: z.string(), details: z.array(z.string()) }),
  }),
  pluginMetadata: openApiMeta({
    summary: 'Create user',
    tags: ['Users'],
  }),
  handler: (ctx) => {
    const user = ctx.req.validatedBody();
    return ctx.res.status(201).json({
      user,
      createdAt: new Date().toISOString(),
    });
  },
});
```

### Complex Parameters

All parameter types are automatically documented:

```typescript
const SearchParamsSchema = z.object({
  q: z.string().min(1).meta({
    description: 'Search query',
    example: 'john',
  }),
  page: z.string().regex(/^\d+$/).transform(Number).default('1').meta({
    description: 'Page number',
    example: '1',
  }),
});

const UserParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number).meta({
    description: 'User ID',
    example: '123',
  }),
});

app.get('/users/:id', {
  requestSchema: zodRequestSchema({
    pathParams: UserParamsSchema,
    queries: SearchParamsSchema,
  }),
  pluginMetadata: openApiMeta({
    summary: 'Get user by ID',
    description: 'Retrieve a specific user by their ID',
    tags: ['Users'],
  }),
  handler: (ctx) => {
    const { id } = ctx.req.validatedParams();
    const { q, page } = ctx.req.validatedQueries();

    return ctx.res.json({ userId: id, search: { q, page } });
  },
});
```

## Route Metadata

### Rich Documentation

Add comprehensive route information:

```typescript
app.post('/users', {
  requestSchema: zodRequestSchema({ body: UserSchema }),
  pluginMetadata: openApiMeta({
    summary: 'Create new user',
    description: `
      Creates a new user account with the provided information.
      The email must be unique across all users.
    `,
    tags: ['Users', 'Authentication'],
    operationId: 'createUser',
    security: [{ bearerAuth: [] }],
    externalDocs: {
      description: 'User management guide',
      url: 'https://docs.myapi.com/users',
    },
  }),
  handler: (ctx) => {
    // handler implementation
  },
});
```

### Tag Organization

Group related endpoints:

```typescript
// User management endpoints
app.post('/users', {
  pluginMetadata: openApiMeta({ tags: ['Users'] }),
  handler: (ctx) => {
    /* ... */
  },
});

app.get('/users/:id', {
  pluginMetadata: openApiMeta({ tags: ['Users'] }),
  handler: (ctx) => {
    /* ... */
  },
});

// Authentication endpoints
app.post('/auth/login', {
  pluginMetadata: openApiMeta({ tags: ['Authentication'] }),
  handler: (ctx) => {
    /* ... */
  },
});
```

## UI Customization

### Swagger UI Configuration

Configure the documentation interface:

```typescript
app.applyPlugin(
  swaggerUiPlugin({
    path: '/docs',
    title: 'My API Documentation',
  }),
);
```

### Multiple Documentation Sites

Serve different documentation for different audiences:

```typescript
// Public API docs
app.applyPlugin(
  swaggerUiPlugin({
    path: '/docs',
    title: 'Public API',
  }),
);

// Internal API docs
app.applyPlugin(
  swaggerUiPlugin({
    path: '/internal-docs',
    title: 'Internal API',
  }),
);
```

## Advanced Configuration

### OpenAPI Specification

Full OpenAPI configuration:

```typescript
const appWithFullOpenApi = app.applyPlugin(
  zodOpenApiPlugin({
    info: {
      title: 'User Management API',
      version: '1.0.0',
      description: 'A comprehensive user management system',
      contact: {
        name: 'API Support',
        url: 'https://myapi.com/support',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' },
      { url: 'https://api.myapp.com', description: 'Production' },
    ],
    tags: [
      { name: 'Users', description: 'User management operations' },
      { name: 'Health', description: 'System health checks' },
    ],
  }),
);
```

### Security Schemes

Document authentication:

```typescript
const appWithAuth = app.applyPlugin(
  zodOpenApiPlugin({
    info: { title: 'Secure API', version: '1.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
        },
      },
    },
  }),
);
```

## Documentation Without Validation

Use schemas for documentation only (no runtime validation):

```typescript
// No validator - documentation only
const app = createKori()
  .applyPlugin(zodOpenApiPlugin())
  .applyPlugin(swaggerUiPlugin({ path: '/docs' }));

app.post('/users', {
  requestSchema: zodRequestSchema({ body: UserSchema }), // Docs only
  pluginMetadata: openApiMeta({
    summary: 'Create user',
    tags: ['Users'],
  }),
  handler: async (ctx) => {
    // Manual parsing - no automatic validation
    const body = await ctx.req.bodyJson();

    // Your custom validation/processing logic
    return ctx.res.json({ success: true });
  },
});
```

## Best Practices

### Schema Documentation

Add rich metadata consistently:

```typescript
const UserSchema = z.object({
  age: z.number().int().min(0, 'Age must be non-negative').meta({
    description: 'User age',
    example: 30,
  }),

  password: z.string().min(8, 'Password must be at least 8 characters').meta({
    description: 'User password (8+ characters)',
    example: 'SecureP@ss123',
    format: 'password',
  }),
});
```

### Error Documentation

Document all possible error responses:

```typescript
const CommonErrorSchema = z.object({
  error: z
    .string()
    .meta({ description: 'Error type', example: 'Validation Error' }),
  message: z.string().meta({ description: 'Human-readable error message' }),
  details: z
    .array(
      z.object({
        field: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
});

app.post('/users', {
  responseSchema: zodResponseSchema({
    201: UserResponseSchema,
    400: CommonErrorSchema,
    409: z.object({
      error: z.literal('Conflict'),
      message: z.literal('Email already exists'),
    }),
  }),
  // ... rest of configuration
});
```

## Next Steps

- **[Zod Schema](/en/extensions/zod-schema)** - Learn more about schema design patterns
- **[Zod Validation](/en/extensions/zod-validation)** - Combine with validation for full type safety
- **[Examples](/en/examples/)** - See complete OpenAPI integration examples

---

**Note:** This documentation is currently being developed. More detailed examples and patterns will be added soon.

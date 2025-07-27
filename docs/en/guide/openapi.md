# OpenAPI Integration

OpenAPI integration is one of Kori's most powerful features. Generate beautiful, interactive API documentation automatically from your Zod schemas with zero maintenance overhead.

> Coming from Validation? Perfect! Since you're already using schemas, adding documentation is just two lines of code. Your validation schemas become beautiful, interactive docs instantly! ✨

## Why Kori's OpenAPI Stands Out

🚀 **Zero Maintenance**: Documentation stays perfectly in sync with your code. Change your schema once, documentation updates automatically.

🎯 **Beautiful Developer Experience**: Interactive documentation with modern UI. Test APIs directly in the browser with real request/response examples.

💪 **Schema-Driven**: Your existing validation schemas power the documentation. No duplicate effort, no documentation drift.

## Quick Start

Install the OpenAPI plugins:

```bash
npm install @korix/zod-openapi-plugin @korix/openapi-scalar-ui-plugin
```

Add two plugins to your existing Kori app:

```typescript
import { createKori } from '@korix/kori';
import { zodOpenApiPlugin, openApiMeta } from '@korix/zod-openapi-plugin';
import { scalarUiPlugin } from '@korix/openapi-scalar-ui-plugin';
import { zodRequestSchema } from '@korix/zod-schema';
import { createKoriZodRequestValidator } from '@korix/zod-validator';

const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
})
  // 1. Generate OpenAPI spec from your schemas
  .applyPlugin(
    zodOpenApiPlugin({
      info: {
        title: 'My API',
        version: '1.0.0',
        description: 'A beautiful API built with Kori',
      },
    }),
  )
  // 2. Serve interactive documentation UI
  .applyPlugin(
    scalarUiPlugin({
      path: '/docs',
      title: 'My API Documentation',
    }),
  );
```

**That's it!** Now visit `http://localhost:3000/docs` for interactive documentation! 🎉

## Basic Example

Here's how your existing validation schemas automatically become documentation:

```typescript
import { z } from 'zod/v4';

// Your schema (same one from validation!)
const UserSchema = z.object({
  name: z.string().min(1).meta({
    description: 'User full name',
    example: 'John Doe',
  }),
  email: z.string().email().meta({
    description: 'Email address',
    example: 'john@example.com',
  }),
  age: z.number().min(18).optional().meta({
    description: 'User age',
    example: 30,
  }),
});

// Your route (add just the metadata!)
app.post('/users', {
  requestSchema: zodRequestSchema({
    body: UserSchema,
  }),
  pluginMetadata: openApiMeta({
    summary: 'Create user',
    description: 'Creates a new user account',
    tags: ['Users'],
  }),
  handler: (ctx) => {
    const user = ctx.req.validated.body;
    return ctx.res.status(201).json({
      user,
      message: 'User created successfully!',
    });
  },
});
```

## What You Get Automatically

### 📊 **Complete Request/Response Documentation**

- Request body schemas with examples
- Query parameter documentation
- Path parameter validation
- Response schemas for all status codes
- Error response documentation

### 🎨 **Interactive Testing Interface**

- Try API endpoints directly in the browser
- Auto-generated request examples
- Live response previews
- Authentication testing support

### 📱 **Modern, Responsive UI**

- Beautiful Scalar UI interface
- Dark/light theme support
- Mobile-friendly design
- Fast, modern performance

## Documentation Workflow

### 1. Schema-First Development

```typescript
// Define your schema once
const ProductSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  category: z.enum(['electronics', 'books', 'clothing']),
});
```

### 2. Add Route Metadata

```typescript
app.post('/products', {
  requestSchema: zodRequestSchema({ body: ProductSchema }),
  pluginMetadata: openApiMeta({
    summary: 'Create product',
    tags: ['Products'],
  }),
  handler: (ctx) => {
    /* your logic */
  },
});
```

### 3. Documentation Updates Automatically

- Schema changes → Documentation updates
- New routes → New documentation pages
- Type changes → Updated examples
- **Zero manual maintenance required!**

## Integration with Validation

OpenAPI works seamlessly with your existing validation setup:

```typescript
// This route provides BOTH validation AND documentation
app.get('/products/:id', {
  requestSchema: zodRequestSchema({
    pathParams: z.object({
      id: z.string().regex(/^\d+$/).transform(Number),
    }),
    queries: z.object({
      include: z.array(z.string()).optional(),
    }),
  }),
  responseSchema: zodResponseSchema({
    200: ProductSchema,
    404: z.object({ error: z.string() }),
  }),
  pluginMetadata: openApiMeta({
    summary: 'Get product by ID',
    tags: ['Products'],
  }),
  handler: (ctx) => {
    const { id } = ctx.req.validated.pathParams; // Validated
    const { include } = ctx.req.validated.queries; // Validated

    // Your logic here...
  },
});
```

**Benefits:**

- ✅ Runtime validation ensures requests are valid
- ✅ Documentation shows exact validation rules
- ✅ Examples are always accurate
- ✅ Type safety throughout your application

## Advanced Features

For complex documentation needs, Kori provides:

- **Custom UI themes** and branding
- **Multiple documentation endpoints** for different audiences
- **Authentication documentation** with security schemes
- **Rich metadata** with external links and examples
- **Performance optimization** for large APIs

## Best Practices

### Start Simple

```typescript
// Begin with basic metadata
pluginMetadata: openApiMeta({
  summary: 'Short description',
  tags: ['Category'],
});
```

### Add Details Progressively

```typescript
// Enhance with richer information
pluginMetadata: openApiMeta({
  summary: 'Create new user account',
  description: 'Creates a user with email verification',
  tags: ['Users', 'Authentication'],
  operationId: 'createUser',
});
```

### Use Schema Metadata

```typescript
// Add examples and descriptions to schemas
const UserSchema = z.object({
  email: z.string().email().meta({
    description: 'Must be unique across all users',
    example: 'user@example.com',
  }),
});
```

## Next Steps

### 🔧 Master OpenAPI Documentation

- **[Zod OpenAPI Plugin](/en/extensions/zod-openapi-plugin)** - Complete documentation API reference
- **[Zod Schema](/en/extensions/zod-schema)** - Advanced schema design for better docs

### 📚 Related Guides

- **[Validation](/en/guide/validation)** - Create schemas that power your documentation
- **[Error Handling](/en/guide/error-handling)** - Document error responses properly

### 💡 Real Examples

- **[REST API Example](/en/examples/rest-api)** - Complete API with documentation
- **[Basic Server Example](/en/examples/basic-server)** - Simple documentation setup

### ⚡ Advanced Documentation

For detailed customization, UI theming, multiple endpoints, and production deployment, see the [Extensions documentation](/en/extensions/zod-openapi-plugin).

---

**Ready to create beautiful API docs?** Start with the [Zod OpenAPI Plugin](/en/extensions/zod-openapi-plugin) for comprehensive configuration options, or explore our [examples](/en/examples/) to see documentation in action!

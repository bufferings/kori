# OpenAPI Integration

Generate interactive API documentation automatically from your schemas. Kori's extensible OpenAPI system keeps your documentation perfectly synchronized with your validation schemas. Using Standard JSON Schema, Kori supports multiple schema libraries including Zod, Valibot, and ArkType.

This guide uses Zod for examples, but the same patterns work with any Standard JSON Schema compliant library.

## Generated OpenAPI

- OpenAPI version: 3.1.0
- JSON Schema version: draft-2020-12

## Supported Libraries

| Library                        | Version | Notes                                    |
| ------------------------------ | ------- | ---------------------------------------- |
| [Zod](https://zod.dev)         | 4.2+    |                                          |
| [ArkType](https://arktype.io)  | 2.1.28+ |                                          |
| [Valibot](https://valibot.dev) | 1.2+    | Requires `@valibot/to-json-schema` v1.5+ |

See [Standard JSON Schema](https://standardschema.dev/json-schema#what-schema-libraries-support-this-spec) for the full list of compliant libraries.

> Note: OpenAPI generation requires higher library versions than basic validation because it depends on Standard JSON Schema export features that were stabilized in later releases.

## Setup

Install the OpenAPI integration plugins:

```bash
npm install @korix/std-schema-openapi-plugin @korix/openapi-swagger-ui-plugin
```

Add two plugins to your Kori application:

```typescript
import { createKori } from '@korix/kori';
import {
  stdSchemaOpenApiPlugin,
  openApiMeta,
} from '@korix/std-schema-openapi-plugin';
import { swaggerUiPlugin } from '@korix/openapi-swagger-ui-plugin';
import {
  stdRequestSchema,
  stdResponseSchema,
  enableStdRequestValidation,
} from '@korix/std-schema-adapter';

const app = createKori({
  ...enableStdRequestValidation(),
})
  // Generate OpenAPI specification from schemas
  .applyPlugin(
    stdSchemaOpenApiPlugin({
      info: {
        title: 'My API',
        version: '1.0.0',
        description: 'A beautiful API built with Kori',
      },
    }),
  )
  // Serve interactive documentation UI
  .applyPlugin(
    swaggerUiPlugin({
      path: '/docs',
      title: 'My API Documentation',
    }),
  );
```

Start your server and visit `http://localhost:3000/docs` to see the interactive documentation!

## Basic Example

Your validation schemas automatically become documentation:

```typescript
import { z } from 'zod';

// Define schema with OpenAPI metadata
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

const UserResponseSchema = z.object({
  user: UserSchema,
  message: z.string(),
});

// Add to your route
app.post('/users', {
  pluginMeta: openApiMeta({
    summary: 'Create user',
    description: 'Creates a new user account',
    tags: ['Users'],
  }),
  requestSchema: stdRequestSchema({
    body: UserSchema,
  }),
  responseSchema: stdResponseSchema({
    '201': UserResponseSchema,
  }),
  handler: (ctx) => {
    const user = ctx.req.validatedBody();
    return ctx.res.status(201).json({
      user,
      message: 'User created successfully!',
    });
  },
});
```

## Schema Documentation

### Request Parameters

Document all types of request parameters:

```typescript
app.get('/products/:id', {
  pluginMeta: openApiMeta({
    summary: 'Get product by ID',
    description: 'Retrieve detailed product information',
    tags: ['Products'],
  }),
  requestSchema: stdRequestSchema({
    params: z.object({
      id: z.string().regex(/^\d+$/).transform(Number).meta({
        description: 'Product ID',
        example: '123',
      }),
    }),
    queries: z.object({
      include: z
        .array(z.string())
        .optional()
        .meta({
          description: 'Fields to include in response',
          example: ['reviews', 'images'],
        }),
      sort: z.enum(['name', 'price', 'created']).default('name').meta({
        description: 'Sort order',
        example: 'price',
      }),
    }),
    headers: z.object({
      'x-api-version': z.enum(['1.0', '2.0']).optional().meta({
        description: 'API version to use',
        example: '2.0',
      }),
    }),
  }),
  responseSchema: stdResponseSchema({
    '200': z.object({
      id: z.number(),
      name: z.string(),
      price: z.number(),
    }),
  }),
  handler: (ctx) => {
    const { id } = ctx.req.validatedParams();
    const queries = ctx.req.validatedQueries();
    const headers = ctx.req.validatedHeaders();

    // Your logic here...
  },
});
```

### Response Documentation

Document different response scenarios:

```typescript
import { stdResponseSchema } from '@korix/std-schema-adapter';

const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  price: z.number(),
  category: z.enum(['electronics', 'books', 'clothing']),
});

const ErrorSchema = z.object({
  error: z.object({
    type: z.string(),
    message: z.string(),
  }),
});

app.get('/products/:id', {
  pluginMeta: openApiMeta({
    summary: 'Get product by ID',
    tags: ['Products'],
  }),
  requestSchema: stdRequestSchema({
    params: z.object({
      id: z.string().regex(/^\d+$/).transform(Number),
    }),
  }),
  responseSchema: stdResponseSchema({
    '200': ProductSchema,
    '404': ErrorSchema,
    '500': ErrorSchema,
  }),
  handler: (ctx) => {
    const { id } = ctx.req.validatedParams();

    if (id === 999) {
      return ctx.res.status(404).json({
        error: 'Not Found',
        message: 'Product not found',
      });
    }

    return ctx.res.json({
      id,
      name: 'Sample Product',
      price: 99.99,
      category: 'electronics',
    });
  },
});
```

## Complete Integration Example

Here's a comprehensive example showing validation and documentation working together:

```typescript
const ProductCreateSchema = z.object({
  name: z.string().min(1).max(100).meta({
    description: 'Product name',
    example: 'Wireless Headphones',
  }),
  price: z.number().positive().meta({
    description: 'Product price in USD',
    example: 99.99,
  }),
  category: z.enum(['electronics', 'books', 'clothing']).meta({
    description: 'Product category',
    example: 'electronics',
  }),
  tags: z
    .array(z.string())
    .optional()
    .meta({
      description: 'Product tags',
      example: ['wireless', 'audio', 'bluetooth'],
    }),
});

app.post('/products', {
  pluginMeta: openApiMeta({
    summary: 'Create product',
    description: 'Create a new product with validation',
    tags: ['Products'],
    operationId: 'createProduct',
  }),
  requestSchema: stdRequestSchema({
    body: ProductCreateSchema,
    headers: z.object({
      'x-client-id': z.string().min(1).meta({
        description: 'Client identifier',
        example: 'mobile-app-v1.2',
      }),
    }),
  }),
  responseSchema: stdResponseSchema({
    '201': z.object({
      id: z.number(),
      name: z.string(),
      price: z.number(),
      category: z.string(),
      createdAt: z.string(),
    }),
    '400': z.object({
      error: z.string(),
      details: z.array(z.string()),
    }),
  }),
  handler: (ctx) => {
    const product = ctx.req.validatedBody();
    const headers = ctx.req.validatedHeaders();

    const newProduct = {
      id: Math.floor(Math.random() * 10000),
      ...product,
      createdAt: new Date().toISOString(),
    };

    return ctx.res.status(201).json(newProduct);
  },
});
```

## Plugin Configuration

### Standard Schema OpenAPI Plugin

The Standard Schema OpenAPI plugin uses the Standard JSON Schema specification to convert schemas to JSON Schema format. This allows support for multiple schema libraries including Zod, Valibot, and ArkType. The generated OpenAPI documentation depends on the JSON Schema capabilities of your chosen schema library.

Configure the OpenAPI specification:

```typescript
stdSchemaOpenApiPlugin({
  info: {
    title: 'My API',
    version: '1.0.0',
    description: 'API documentation',
  },
  servers: [
    { url: 'https://api.example.com', description: 'Production' },
    { url: 'http://localhost:3000', description: 'Development' },
  ],
  // Default endpoint for JSON spec
  documentPath: '/openapi.json',
});
```

### Swagger UI Plugin

Configure the documentation interface:

```typescript
swaggerUiPlugin({
  // UI endpoint path
  path: '/docs',
  // Page title
  title: 'API Documentation',
});
```

## Integration with Validation

OpenAPI documentation works seamlessly with your existing validation:

- Runtime validation ensures requests match documentation
- Type safety throughout your application
- Documentation automatically updates when schemas change
- Schema definitions are always in sync with validation rules

The same schema powers both validation and documentation, eliminating the possibility of documentation drift.

## Documentation-Only Mode

You can generate OpenAPI documentation without runtime validation. This is useful when you want API documentation but handle validation differently:

```typescript
import { createKori } from '@korix/kori';
import {
  stdSchemaOpenApiPlugin,
  openApiMeta,
} from '@korix/std-schema-openapi-plugin';
import { swaggerUiPlugin } from '@korix/openapi-swagger-ui-plugin';
import { stdRequestSchema, stdResponseSchema } from '@korix/std-schema-adapter';
import { z } from 'zod';

// No requestValidator or responseValidator
const app = createKori()
  .applyPlugin(
    stdSchemaOpenApiPlugin({
      info: {
        title: 'My API',
        version: '1.0.0',
        description: 'API with documentation only',
      },
    }),
  )
  .applyPlugin(
    swaggerUiPlugin({
      path: '/docs',
    }),
  );

// Schema is used for documentation only, not validation
app.post('/users', {
  pluginMeta: openApiMeta({
    summary: 'Create user',
    tags: ['Users'],
  }),
  requestSchema: stdRequestSchema({
    body: z.object({
      name: z.string().meta({ description: 'User name' }),
      email: z.string().email().meta({ description: 'User email' }),
    }),
  }),
  responseSchema: stdResponseSchema({
    '201': z.object({
      id: z.number(),
      name: z.string(),
      email: z.string(),
    }),
  }),
  handler: async (ctx) => {
    // Handle request without automatic validation
    const body = await ctx.req.bodyJson(); // Returns unknown, not validated

    // Your custom validation logic here

    return ctx.res.status(201).json({
      id: 123,
      name: 'John',
      email: 'john@example.com',
    });
  },
});
```

In this mode:

- `ctx.req.validatedBody()` is not available
- Use `ctx.req.bodyJson()`, `ctx.req.params()`, etc. for raw data
- Implement your own validation logic if needed
- OpenAPI documentation is still generated from schemas
- Interactive documentation is available at `/docs`

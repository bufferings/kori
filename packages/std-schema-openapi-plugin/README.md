# @korix/std-schema-openapi-plugin

OpenAPI plugin for Standard JSON Schema in the Kori framework.

This plugin generates OpenAPI 3.1.0 documentation from schemas that implement the [Standard JSON Schema](https://standardschema.dev/json-schema) specification.

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

## Installation

```bash
npm install @korix/std-schema-openapi-plugin @korix/openapi-plugin @korix/kori
```

## Usage

```typescript
import { createKori } from '@korix/kori';
import { stdSchemaOpenApiPlugin } from '@korix/std-schema-openapi-plugin';
import { swaggerUiPlugin } from '@korix/openapi-swagger-ui-plugin';
import {
  stdRequestSchema,
  stdResponseSchema,
  enableStdRequestAndResponseValidation,
} from '@korix/std-schema-adapter';
import { z } from 'zod';

const app = createKori({
  ...enableStdRequestAndResponseValidation(),
})
  .applyPlugin(
    stdSchemaOpenApiPlugin({
      info: {
        title: 'My API',
        version: '1.0.0',
      },
    }),
  )
  .applyPlugin(swaggerUiPlugin());

app.post('/users', {
  requestSchema: stdRequestSchema({
    body: z.object({
      name: z.string(),
      email: z.string().email(),
    }),
  }),
  responseSchema: stdResponseSchema({
    '201': z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    }),
  }),
  handler: (ctx) => {
    const { name, email } = ctx.req.validatedBody();
    return ctx.res.status(201).json({ id: 'user-123', name, email });
  },
});
```

Visit `http://localhost:3000/docs` for interactive API documentation.

## Configuration

```typescript
stdSchemaOpenApiPlugin({
  // Required: API information
  info: {
    title: 'My API',
    version: '1.0.0',
    description: 'API documentation',
  },

  // Optional: Server configurations
  servers: [
    { url: 'https://api.example.com', description: 'Production' },
    { url: 'http://localhost:3000', description: 'Development' },
  ],

  // Optional: Custom document endpoint path (default: '/openapi.json')
  documentPath: '/openapi.json',
});
```

## Route Metadata

Use `openApiMeta()` to add OpenAPI-specific metadata to routes:

```typescript
import { openApiMeta } from '@korix/std-schema-openapi-plugin';

app.get('/users', {
  pluginMeta: openApiMeta({
    summary: 'List users',
    description: 'Get all users in the system',
    tags: ['users'],
    operationId: 'listUsers',
    exclude: false, // Set to true to exclude from OpenAPI document
  }),
  handler: (ctx) => ctx.res.json([]),
});
```

## License

MIT


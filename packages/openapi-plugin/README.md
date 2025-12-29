# @korix/openapi-plugin

OpenAPI 3.1 document generation plugin for Kori framework.

> **Note**: This is the base plugin for OpenAPI document generation. For actual use, you'll typically use `@korix/std-schema-openapi-plugin` which provides Standard JSON Schema support for Zod, Valibot, ArkType, and other schema libraries. This package provides the core OpenAPI generation functionality and schema converter interface.

## Features

- Automatic OpenAPI 3.1.0 document generation from Kori routes
- Path parameter auto-generation from route patterns
- Automatic `operationId` generation (customizable)
- Request/response schema conversion to OpenAPI format
- Route metadata support (summary, description, tags)
- Route exclusion control
- Document caching for performance

## Installation

```bash
npm install @korix/openapi-plugin
```

## Basic Usage

```typescript
import { createKori } from '@korix/kori';
import { openApiPlugin } from '@korix/openapi-plugin';

const app = createKori()
  .applyPlugin(
    openApiPlugin({
      info: {
        title: 'My API',
        version: '1.0.0',
        description: 'API documentation',
      },
      converters: [mySchemaConverter],
    }),
  )
  .get('/users/:id', {
    requestSchema: myRequestSchema,
    handler: (ctx) => {
      const { id } = ctx.req.params();
      return ctx.res.json({ id, name: 'John' });
    },
  });

// OpenAPI document available at: GET /openapi.json
```

## Configuration

### Plugin Options

```typescript
openApiPlugin({
  // Required: API information
  info: {
    title: string;
    version: string;
    description?: string;
    // ... other OpenAPI InfoObject fields
  },

  // Required: Schema converters for your validation library
  converters: SchemaConverter[];

  // Optional: Custom document endpoint path (default: '/openapi.json')
  documentPath?: string;

  // Optional: Server configurations
  servers?: ServerObject[];
})
```

### Route Metadata

Use `openApiMeta()` to add OpenAPI-specific metadata to routes:

```typescript
import { openApiMeta } from '@korix/openapi-plugin';

app.get('/users', {
  pluginMeta: openApiMeta({
    summary: 'List users',
    description: 'Get all users in the system',
    tags: ['users'],
    operationId: 'listUsers', // Optional: override auto-generated ID
    exclude: false, // Optional: exclude from OpenAPI document
  }),
  handler: (ctx) => ctx.res.json([]),
});
```

## Path Parameters

### Automatic Generation

Path parameters are automatically extracted from route patterns:

```typescript
app.get('/users/:id', {
  handler: (ctx) => ctx.res.json({ id: ctx.req.param('id') }),
});
```

Generates:

```json
{
  "paths": {
    "/users/{id}": {
      "get": {
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          }
        ]
      }
    }
  }
}
```

### Schema Enrichment

Provide a `params` schema to add type information and descriptions:

```typescript
import { stdRequestSchema } from '@korix/std-schema-adapter';
import { z } from 'zod';

app.get('/users/:id', {
  requestSchema: stdRequestSchema({
    params: z.object({
      id: z.uuid().meta({ description: 'User UUID' }),
    }),
  }),
  handler: (ctx) => ctx.res.json({ id: ctx.req.param('id') }),
});
```

Generates:

```json
{
  "parameters": [
    {
      "name": "id",
      "in": "path",
      "required": true,
      "description": "User UUID",
      "schema": {
        "type": "string",
        "format": "uuid",
        "description": "User UUID"
      }
    }
  ]
}
```

## Operation ID

Operation IDs are automatically generated from method and path:

| Path                           | Method | Generated operationId           |
| ------------------------------ | ------ | ------------------------------- |
| `/`                            | GET    | `getIndex`                      |
| `/users`                       | GET    | `getUsers`                      |
| `/users/:id`                   | GET    | `getUsersById`                  |
| `/teams/:teamId/users/:userId` | GET    | `getTeamsByTeamIdUsersByUserId` |

Override with metadata:

```typescript
app.get('/users', {
  pluginMeta: openApiMeta({ operationId: 'listAllUsers' }),
  handler: (ctx) => ctx.res.json([]),
});
```

## Advanced Path Patterns

The plugin handles advanced Hono-style path patterns:

### Optional Parameters

```typescript
app.get('/api/:version?', {
  handler: (ctx) => ctx.res.json({}),
});
// Converts to: /api/{version}
```

### Regex Constraints

```typescript
app.get('/post/:date{[0-9]+}', {
  handler: (ctx) => ctx.res.json({}),
});
// Converts to: /post/{date}
// Regex constraint is removed (OpenAPI doesn't support it)
```

## Unsupported Patterns

The following patterns are not supported by OpenAPI and will be skipped with an info-level log:

### Wildcard Paths

```typescript
app.get('/files/*', {
  handler: (ctx) => ctx.res.text('file'),
});
// Skipped: OpenAPI doesn't support wildcard syntax
// Log: "Skipping route with wildcard path"
```

### Custom HTTP Methods

```typescript
app.route({
  method: { custom: 'CUSTOM' },
  path: '/custom',
  handler: (ctx) => ctx.res.json({}),
});
// Skipped: OpenAPI only supports standard HTTP methods
// Log: "Skipping route with custom HTTP method"
```

## Excluding Routes

Exclude specific routes from the OpenAPI document:

```typescript
app
  .get('/public', {
    handler: (ctx) => ctx.res.json({}),
  })
  .get('/internal', {
    pluginMeta: openApiMeta({ exclude: true }),
    handler: (ctx) => ctx.res.json({}),
  });
// Only /public appears in OpenAPI document
```

## Document Caching

The OpenAPI document is generated once and cached. It's regenerated only when route definitions change (during development with hot reload).

## Implementation Notes

### Path Parameter Handling

- **Path pattern is the source of truth** for parameter names
- **Schema enriches** path parameters with type information and metadata
- Schema properties not present in the path are ignored with a warning
- All path parameters are `required: true` (per OpenAPI specification)

### Conversion Failures

When schema conversion fails, the plugin logs a warning and:

- **Request body**: Returns `undefined` (no requestBody in operation)
- **Response**: Skips the response
- **Path parameters**: Uses default `{ type: 'string' }` for parameters not in schema

### Logging

All conversion failures and skipped routes are logged with contextual information:

- Route context (method, path) via `log.child()`
- Provider information for failed conversions
- Property/parameter names for mismatches

## TypeScript

The plugin extends the Kori environment type with OpenAPI configuration:

```typescript
type OpenApiEnvExtension = {
  openapi: {
    documentPath: string;
  };
};
```

Access configuration in handlers:

```typescript
const documentPath = ctx.env.openapi.documentPath;
```

## License

MIT

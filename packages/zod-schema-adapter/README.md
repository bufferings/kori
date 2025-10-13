# @korix/zod-schema-adapter

Zod schema adapter for request and response validation in the Kori framework.

This adapter provides full access to Zod's error types and is **recommended if you're only using Zod**. For projects using multiple validation libraries, see [@korix/standard-schema-adapter](../standard-schema-adapter).

## Features

- Request validation (body, params, query, headers)
- Response validation by status code
- Custom error handlers for validation failures
- Type-safe validated data access
- Content negotiation support for request bodies

## Installation

```bash
npm install @korix/zod-schema-adapter @korix/kori zod
```

## Quick Start

### Request Validation

```typescript
import { createKori } from '@korix/kori';
import { enableZodRequestValidation, zodRequestSchema } from '@korix/zod-schema-adapter';
import { z } from 'zod';

const app = createKori({
  ...enableZodRequestValidation(),
}).post('/users', {
  requestSchema: zodRequestSchema({
    body: z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().min(18),
    }),
  }),
  handler: (ctx) => {
    const { name, email, age } = ctx.req.validatedBody();
    return ctx.res.json({ id: 'user-123', name, email, age });
  },
});
```

### Response Validation

```typescript
import { createKori } from '@korix/kori';
import { enableZodResponseValidation, zodResponseSchema } from '@korix/zod-schema-adapter';
import { z } from 'zod';

const app = createKori({
  ...enableZodResponseValidation(),
}).get('/users/:id', {
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
    return ctx.res.json({ id, name: 'John', email: 'john@example.com' });
  },
});
```

### Full Validation (Request + Response)

```typescript
import { createKori } from '@korix/kori';
import { enableZodRequestAndResponseValidation, zodRequestSchema, zodResponseSchema } from '@korix/zod-schema-adapter';
import { z } from 'zod';

const app = createKori({
  ...enableZodRequestAndResponseValidation({
    onRequestValidationFailure: (ctx) => {
      return ctx.res.badRequest({ message: 'Invalid request data' });
    },
    onResponseValidationFailure: (ctx, failure) => {
      console.error('Response validation failed:', failure);
    },
  }),
}).post('/users', {
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
  handler: (ctx) => {
    const { name, email } = ctx.req.validatedBody();
    return ctx.res.status(201).json({
      id: `user-${Date.now()}`,
      name,
      email,
    });
  },
});
```

## API Reference

### `enableZodRequestValidation(options?)`

Enables request validation for the Kori application.

Options:

- `onRequestValidationFailure` - Optional callback for handling validation failures. If not provided, returns a default 400 Bad Request response.

### `enableZodResponseValidation(options?)`

Enables response validation for the Kori application.

Options:

- `onResponseValidationFailure` - Optional callback for handling validation failures. Response validation failures are logged but do not affect the response sent to clients.

### `enableZodRequestAndResponseValidation(options?)`

Enables both request and response validation.

Options:

- `onRequestValidationFailure` - Optional callback for request validation failures
- `onResponseValidationFailure` - Optional callback for response validation failures

### `zodRequestSchema(schema)`

Creates a request schema for validation.

Schema properties:

- `body` - Request body schema (simple or content-based)
- `params` - Path parameters schema
- `query` - Query parameters schema
- `headers` - Request headers schema

### `zodResponseSchema(schema)`

Creates a response schema for validation by status code.

Example:

```typescript
zodResponseSchema({
  200: successSchema,
  400: badRequestSchema,
  404: notFoundSchema,
});
```

## Request Schema Options

### Simple Body Schema

```typescript
requestSchema: zodRequestSchema({
  body: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
});
```

### Content-Based Body Schema

For content negotiation with multiple media types:

```typescript
requestSchema: zodRequestSchema({
  body: {
    content: {
      'application/json': z.object({
        name: z.string(),
        email: z.string().email(),
      }),
      'application/xml': z.object({
        user: z.object({
          name: z.string(),
          email: z.string(),
        }),
      }),
    },
  },
});

// In handler, access with media type discrimination
handler: (ctx) => {
  const body = ctx.req.validatedBody();
  if (body.mediaType === 'application/json') {
    const { name, email } = body.value;
    // Process JSON body
  } else if (body.mediaType === 'application/xml') {
    const { user } = body.value;
    // Process XML body
  }
};
```

## Validated Data Access

After validation, you can access the validated data using type-safe methods:

```typescript
handler: (ctx) => {
  const body = ctx.req.validatedBody(); // Validated request body
  const params = ctx.req.validatedParams(); // Validated path parameters
  const query = ctx.req.validatedQuery(); // Validated query parameters
  const headers = ctx.req.validatedHeaders(); // Validated headers

  // All values are fully typed based on your Zod schema
};
```

## Error Handling

### Request Validation

By default, request validation failures return a 400 Bad Request response. You can customize this behavior:

```typescript
const app = createKori({
  ...enableZodRequestValidation({
    onRequestValidationFailure: (ctx) => {
      return ctx.res.status(422).json({
        error: 'Validation failed',
        details: ctx.req.validationFailure,
      });
    },
  }),
});
```

### Response Validation

Response validation failures are logged but do not affect the response sent to clients. This prevents breaking the API when response schemas don't match:

```typescript
const app = createKori({
  ...enableZodResponseValidation({
    onResponseValidationFailure: (ctx, failure) => {
      console.error('Response validation failed:', {
        path: ctx.req.path(),
        failure,
      });
      // Optionally send alerts, metrics, etc.
    },
  }),
});
```

## Difference from @korix/standard-schema-adapter

**When to use this adapter:**

Use `@korix/zod-schema-adapter` if you're only using Zod and want:

- **Full Zod error types** - Access to `z.core.$ZodIssue[]` with all Zod-specific error information
- Direct Zod integration for optimal type inference
- Zod-specific error handling in custom validation failure handlers

**When to use standard-schema-adapter:**

Use [@korix/standard-schema-adapter](../standard-schema-adapter) if you need:

- Support for multiple validation libraries (Zod, Valibot, ArkType, etc.)
- Library-agnostic validation setup
- Standard Schema-compliant error types (`StandardSchemaV1.Issue[]`)

## Related Packages

- [@korix/standard-schema-adapter](../standard-schema-adapter): Multi-library schema adapter using Standard Schema
- [@korix/zod-openapi-plugin](../zod-openapi-plugin): OpenAPI documentation generation with Zod schemas

## License

MIT

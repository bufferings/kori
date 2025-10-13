# @korix/standard-schema-adapter

Standard Schema adapter for request and response validation in the Kori framework.

This adapter enables validation using any library that conforms to the [@standard-schema/spec](https://github.com/standard-schema/standard-schema), including Zod, Valibot, and ArkType.

## Features

- Request validation (body, params, query, headers)
- Response validation by status code
- Custom error handlers for validation failures
- Support for all Standard Schema-compliant libraries (Zod, Valibot, ArkType, etc.)
- Type-safe validated data access

## Installation

```bash
npm install @korix/standard-schema-adapter @korix/kori @standard-schema/spec
```

Then install your preferred validation library:

```bash
# For Zod
npm install zod

# For Valibot
npm install valibot

# For ArkType
npm install arktype
```

## Quick Start

### Request Validation (Zod)

```typescript
import { createKori } from '@korix/kori';
import { enableStdRequestValidation, stdRequestSchema } from '@korix/standard-schema-adapter';
import { z } from 'zod';

const app = createKori({
  ...enableStdRequestValidation(),
}).post('/users', {
  requestSchema: stdRequestSchema({
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

### Response Validation (Valibot)

```typescript
import { createKori } from '@korix/kori';
import { enableStdResponseValidation, stdResponseSchema } from '@korix/standard-schema-adapter';
import * as v from 'valibot';

const app = createKori({
  ...enableStdResponseValidation(),
}).get('/users/:id', {
  responseSchema: stdResponseSchema({
    '200': v.object({
      id: v.string(),
      name: v.string(),
      email: v.pipe(v.string(), v.email()),
    }),
    '404': v.object({
      error: v.object({
        type: v.string(),
        message: v.string(),
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
import {
  enableStdRequestAndResponseValidation,
  stdRequestSchema,
  stdResponseSchema,
} from '@korix/standard-schema-adapter';
import { z } from 'zod';

const app = createKori({
  ...enableStdRequestAndResponseValidation({
    onRequestValidationFailure: (ctx) => {
      return ctx.res.badRequest({ message: 'Invalid request data' });
    },
    onResponseValidationFailure: (ctx, failure) => {
      console.error('Response validation failed:', failure);
    },
  }),
}).post('/users', {
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
    return ctx.res.status(201).json({
      id: `user-${Date.now()}`,
      name,
      email,
    });
  },
});
```

## API Reference

### `enableStdRequestValidation(options?)`

Enables request validation for the Kori application.

Options:

- `onRequestValidationFailure` - Optional callback for handling validation failures. If not provided, returns a default 400 Bad Request response.

### `enableStdResponseValidation(options?)`

Enables response validation for the Kori application.

Options:

- `onResponseValidationFailure` - Optional callback for handling validation failures. Response validation failures are logged but do not affect the response sent to clients.

### `enableStdRequestAndResponseValidation(options?)`

Enables both request and response validation.

Options:

- `onRequestValidationFailure` - Optional callback for request validation failures
- `onResponseValidationFailure` - Optional callback for response validation failures

### `stdRequestSchema(schema)`

Creates a request schema for validation.

Schema properties:

- `body` - Request body schema (simple or content-based)
- `params` - Path parameters schema
- `query` - Query parameters schema
- `headers` - Request headers schema

### `stdResponseSchema(schema)`

Creates a response schema for validation by status code.

Example:

```typescript
stdResponseSchema({
  200: successSchema,
  400: badRequestSchema,
  404: notFoundSchema,
});
```

## Request Schema Options

### Simple Body Schema

```typescript
requestSchema: stdRequestSchema({
  body: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
});
```

### Content-Based Body Schema

For content negotiation with multiple media types:

```typescript
requestSchema: stdRequestSchema({
  body: {
    content: {
      'application/json': z.object({
        name: z.string(),
        email: z.string().email(),
      }),
      'application/xml': v.object({
        user: v.object({
          name: v.string(),
          email: v.pipe(v.string(), v.email()),
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

  // All values are fully typed based on your schema
};
```

## Error Handling

### Request Validation

By default, request validation failures return a 400 Bad Request response. You can customize this behavior:

```typescript
const app = createKori({
  ...enableStdRequestValidation({
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
  ...enableStdResponseValidation({
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

## Difference from @korix/zod-schema-adapter

**When to use this adapter:**

Use `@korix/standard-schema-adapter` if you need:

- Support for multiple validation libraries (Zod, Valibot, ArkType, etc.)
- Library-agnostic validation setup
- Standard Schema-compliant error types (`StandardSchemaV1.Issue[]`)

**When to use zod-schema-adapter:**

Use [@korix/zod-schema-adapter](../zod-schema-adapter) if you're only using Zod and want:

- **Full Zod error types** - Access to `z.core.$ZodIssue[]` with all Zod-specific error information
- Direct Zod integration for optimal type inference
- Zod-specific error handling in custom validation failure handlers

## Supported Libraries

This adapter works with any library that implements the [@standard-schema/spec](https://github.com/standard-schema/standard-schema):

- [Zod](https://github.com/colinhacks/zod) v4.0+
- [Valibot](https://github.com/fabian-hiller/valibot) v1.0+
- [ArkType](https://github.com/arktypeio/arktype) v2.0+
- Any other Standard Schema-compliant library

## License

MIT

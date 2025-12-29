# Request Validation

Request validation is at the heart of Kori's type-safe development experience. Kori's extensible validation system provides type-safe, runtime validation with automatic type generation - no casting required. Using Standard Schema, Kori supports multiple validation libraries including Zod, Valibot, and ArkType.

This guide uses Zod for examples, but the same patterns work with any Standard Schema compliant library.

## Supported Libraries

| Library                        | Version |
| ------------------------------ | ------- |
| [Zod](https://zod.dev)         | 4.0+    |
| [Valibot](https://valibot.dev) | 1.0+    |
| [ArkType](https://arktype.io)  | 2.0+    |

See [Standard Schema](https://standardschema.dev/) for the full list of compliant libraries.

## Setup

Install the Standard Schema integration packages:

```bash
npm install @korix/std-schema-adapter @standard-schema/spec zod
```

Set up your Kori application with validation:

```typescript
import { createKori } from '@korix/kori';
import {
  stdRequestSchema,
  enableStdRequestValidation,
} from '@korix/std-schema-adapter';
import { z } from 'zod';

const app = createKori({
  ...enableStdRequestValidation(),
});
```

## Basic Example

Start with a simple request body validation to see how Kori transforms your API development:

```typescript
const UserSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(0),
});

app.post('/users', {
  requestSchema: stdRequestSchema({
    body: UserSchema,
  }),
  handler: (ctx) => {
    // Fully typed and validated!
    const user = ctx.req.validatedBody();

    return ctx.res.status(201).json({
      message: 'User created',
      user,
    });
  },
});
```

Kori automatically handles:

- Request body parsing and validation
- TypeScript type inference from your schema
- Rejecting invalid requests before reaching your handler

## Validating All Request Parts

Kori can validate every part of an HTTP request: path parameters, query parameters, headers, and request body.

```typescript
app.put('/users/:id', {
  requestSchema: stdRequestSchema({
    params: z.object({
      id: z.string().regex(/^\d+$/).transform(Number),
    }),
    queries: z.object({
      notify: z
        .enum(['true', 'false'])
        .transform((val) => val === 'true')
        .optional(),
      include: z.string().optional(),
    }),
    headers: z.object({
      authorization: z.string().startsWith('Bearer '),
    }),
    cookies: z.object({
      sessionId: z.uuid(),
      theme: z.enum(['light', 'dark']).optional(),
    }),
    body: z.object({
      name: z.string().min(1).optional(),
      age: z.number().int().min(0).optional(),
    }),
  }),
  handler: (ctx) => {
    // Everything is validated and properly typed
    const { id } = ctx.req.validatedParams();
    const { notify, include } = ctx.req.validatedQueries();
    const { authorization } = ctx.req.validatedHeaders();
    const { sessionId, theme } = ctx.req.validatedCookies();
    const updates = ctx.req.validatedBody();

    return ctx.res.json({
      userId: id,
      updates,
      willNotify: notify ?? false,
      token: authorization,
      session: { id: sessionId, theme },
    });
  },
});
```

## Request Body Content Types

By default, Kori supports JSON and form-encoded bodies. You can explicitly define schemas for different content types:

```typescript
const JsonUserSchema = z.object({
  name: z.string(),
  age: z.number().int().min(0),
});

const FormUserSchema = z.object({
  name: z.string(),
  // Form data values are strings, transform as needed
  age: z.string().transform(Number),
});

app.post('/users', {
  requestSchema: stdRequestSchema({
    body: {
      content: {
        'application/json': JsonUserSchema,
        'application/x-www-form-urlencoded': FormUserSchema,
      },
    },
  }),
  handler: (ctx) => {
    const userData = ctx.req.validatedBody();

    // Discriminated union allows type-safe handling
    if (userData.mediaType === 'application/x-www-form-urlencoded') {
      // userData.value is typed as FormUser (with number age)
      const user = userData.value;
      return ctx.res.json({ source: 'form', user });
    } else {
      // userData.value is typed as JsonUser (with optional age)
      const user = userData.value;
      return ctx.res.json({ source: 'json', user });
    }
  },
});
```

## Body Parse Type

When defining content types, you can explicitly control how the request body is parsed using the `parseType` option. This is useful for non-standard content types or when you want to force a specific parsing method.

The available parse types are: `'json'`, `'form'`, `'text'`, `'binary'`, and `'auto'` (default).

```typescript
const WebhookSchema = z.object({
  event: z.string(),
  payload: z.record(z.unknown()),
});

app.post('/webhook', {
  requestSchema: stdRequestSchema({
    body: {
      content: {
        // Parse custom content type as JSON
        'application/vnd.custom+json': {
          schema: WebhookSchema,
          parseType: 'json',
        },
        // Parse binary data
        'application/octet-stream': {
          schema: z.instanceof(ArrayBuffer),
          parseType: 'binary',
        },
      },
    },
  }),
  handler: (ctx) => {
    const body = ctx.req.validatedBody();
    // ...
  },
});
```

## Error Handling

Kori provides flexible error handling for validation failures with multiple levels of customization.

### Default Behavior

By default, validation failures return a `400 Bad Request` response:

```json
{
  "error": {
    "type": "BAD_REQUEST",
    "message": "Request validation failed"
  }
}
```

Content type errors return a `415 Unsupported Media Type` response when the request content type doesn't match any defined schema:

```json
{
  "error": {
    "type": "UNSUPPORTED_MEDIA_TYPE",
    "message": "Unsupported Media Type"
  }
}
```

### Custom Error Handlers

You can provide custom error handlers at both the route and instance levels to customize validation error responses.

#### Route-Level Error Handler

Handle validation errors for a specific route:

```typescript
app.post('/users', {
  requestSchema: stdRequestSchema({
    body: UserCreateSchema,
  }),
  onRequestValidationFailure: (ctx, error) => {
    // Access detailed validation errors
    if (
      error.body &&
      error.body.stage === 'validation' &&
      error.body.reason.type === 'Validation'
    ) {
      const validationError = error.body.reason;
      return ctx.res.badRequest({
        message: 'Validation failed',
        details: validationError.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      });
    }

    return ctx.res.badRequest({
      message: 'Validation failed',
    });
  },
  handler: (ctx) => {
    const user = ctx.req.validatedBody();
    // Create user logic...
    return ctx.res.json({ message: 'User created', user });
  },
});
```

#### Instance-Level Error Handler

Set a global error handler for all routes:

```typescript
const app = createKori({
  ...enableStdRequestValidation(),
  onRequestValidationFailure: (ctx, error) => {
    // Global validation error handling
    ctx.log().warn('Validation failed', { error });

    return ctx.res.status(400).json({
      error: 'Invalid request data',
      timestamp: new Date().toISOString(),
    });
  },
});
```

#### Handler Priority

Error handlers are called in this order:

1. Route-level handler (if provided)
2. Instance-level handler (if provided)
3. Default behavior

Each handler can choose to handle the error or pass it to the next handler by not returning a response. This allows specific handlers to only deal with certain error types.

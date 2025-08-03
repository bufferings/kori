# Request Validation

Request validation is at the heart of Kori's type-safe development experience. Kori's extensible validation system provides type-safe, runtime validation with automatic type generation - no casting required. While Kori's architecture is designed to support different validation libraries, we officially provide first-class Zod integration out of the box.

## Setup

Install the Zod integration packages:

```bash
npm install @korix/zod-validator @korix/zod-schema zod
```

Set up your Kori application with validation:

```typescript
import { createKori } from '@korix/kori';
import { createKoriZodRequestValidator } from '@korix/zod-validator';
import { zodRequestSchema } from '@korix/zod-schema';
import { z } from 'zod';

const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
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
  requestSchema: zodRequestSchema({
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
  requestSchema: zodRequestSchema({
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
    const updates = ctx.req.validatedBody();

    return ctx.res.json({
      userId: id,
      updates,
      willNotify: notify ?? false,
      token: authorization,
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
  requestSchema: zodRequestSchema({
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
  requestSchema: zodRequestSchema({
    body: UserCreateSchema,
  }),
  onRequestValidationError: (ctx, error) => {
    // Access detailed Zod validation errors
    if (error.body && 'issues' in error.body) {
      return ctx.res.badRequest({
        message: 'Validation failed',
        details: error.body.issues.map((issue) => ({
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
  requestValidator: createKoriZodRequestValidator(),
  onRequestValidationError: (ctx, error) => {
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

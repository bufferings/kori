# Response Validation

Response validation ensures your API returns data that matches your defined schemas. This provides type safety for API consumers and helps catch bugs early in development.

## Setup

Install the Zod integration packages:

```bash
npm install @korix/zod-validator @korix/zod-schema zod
```

Set up your Kori application with response validation:

```typescript
import { createKori } from '@korix/kori';
import { createKoriZodResponseValidator } from '@korix/zod-validator';
import { zodResponseSchema } from '@korix/zod-schema';
import { z } from 'zod';

const app = createKori({
  responseValidator: createKoriZodResponseValidator(),
});
```

## Basic Example

Define response schemas for different status codes:

```typescript
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  age: z.number().int().min(0),
  createdAt: z.string(),
});

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
});

app.get('/users/:id', {
  responseSchema: zodResponseSchema({
    200: UserSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  }),
  handler: (ctx) => {
    const id = Number(ctx.req.pathParam('id'));

    if (id === 999) {
      // This 404 response will be validated against ErrorSchema
      return ctx.res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    // This 200 response will be validated against UserSchema
    return ctx.res.status(200).json({
      id,
      name: 'John Doe',
      age: 30,
      createdAt: new Date().toISOString(),
    });
  },
});
```

> **Note**: Response validation only checks your data at runtime. TypeScript won't catch mismatches between `ctx.res.json()` and your schema—those are detected after your handler completes.

## Response Schema Patterns

### Status Code Matching

Response schemas support multiple status code patterns:

```typescript
app.post('/users', {
  responseSchema: zodResponseSchema({
    // Exact status codes
    201: UserSchema,
    400: ErrorSchema,
    409: ErrorSchema,

    // Wildcard patterns (matches any status code starting with 5)
    '5XX': ErrorSchema,

    // Default fallback for unspecified status codes
    default: ErrorSchema,
  }),
  handler: (ctx) => {
    // Handler logic
  },
});
```

### Content Type Support

Define different schemas for different content types:

```typescript
const HtmlErrorSchema = z.string();
const JsonErrorSchema = z.object({
  error: z.string(),
  details: z.array(z.string()).optional(),
});

app.get('/data', {
  responseSchema: zodResponseSchema({
    200: UserSchema,
    400: {
      content: {
        'application/json': JsonErrorSchema,
        'text/html': HtmlErrorSchema,
      },
    },
  }),
  handler: (ctx) => {
    // Handler logic
  },
});
```

## Error Handling

Response validation errors are handled differently from request validation errors. By default, validation failures are logged but don't affect the response sent to the client.

### Default Behavior

When response validation fails:

- A warning is logged to the application logs
- The original response is sent to the client unchanged
- No error is thrown to the client

This ensures that response validation issues don't break your API for end users.

### Custom Error Handlers

You can provide custom response validation error handlers:

#### Route-Level Error Handler

```typescript
app.get('/users/:id', {
  responseSchema: zodResponseSchema({
    200: UserSchema,
  }),
  onResponseValidationError: (ctx, error) => {
    // Log the validation error with more context
    ctx.req.log().error('Response validation failed', {
      path: ctx.req.path(),
      status: ctx.res.getStatus(),
      error,
    });

    // Optionally return a different response
    return ctx.res.status(500).json({
      error: 'Internal Server Error',
      message: 'Invalid response format',
    });
  },
  handler: (ctx) => {
    // Handler logic
  },
});
```

#### Instance-Level Error Handler

```typescript
const app = createKori({
  responseValidator: createKoriZodResponseValidator(),
  onResponseValidationError: (ctx, error) => {
    // Global response validation error handling
    ctx.req.log().error('Response validation failed globally', { error });

    // Return undefined to use the original response
    return undefined;
  },
});
```

### Handler Priority

Response validation error handlers follow the same priority as request validation:

1. Route-level handler (if provided)
2. Instance-level handler (if provided)
3. Default behavior (log warning, send original response)

Each handler can choose to handle the error or pass it to the next handler by returning `undefined`. This allows specific handlers to only deal with certain error types.

## Stream Response Handling

Response validation automatically skips validation for streaming responses, as they cannot be validated before being sent to the client.

```typescript
app.get('/download', {
  responseSchema: zodResponseSchema({
    200: z.string(), // This won't be validated for streams
  }),
  handler: (ctx) => {
    // Streaming responses are not validated
    return ctx.res.stream(someReadableStream);
  },
});
```

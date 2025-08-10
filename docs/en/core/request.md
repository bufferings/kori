# Request API Reference

The `KoriRequest` object (accessed as `ctx.req`) provides access to all incoming HTTP request data with a clean, type-safe API.

## Type Definition

```typescript
type KoriRequest<
  PathParams extends Record<string, string> = Record<string, string>,
> = {
  // Core request data
  raw(): Request;
  log(): KoriLogger;
  url(): URL;
  method(): string;

  // Parameters
  pathParams(): PathParams;
  queryParams(): Record<string, string | string[]>;

  // Headers
  headers(): Record<string, string>;
  header(name: HttpRequestHeaderName): string | undefined;
  fullContentType(): string | undefined;
  contentType(): ContentTypeValue | undefined;

  // Cookies
  cookies(): Record<string, string>;
  cookie(name: string): string | undefined;

  // Body parsing
  bodyJson(): Promise<unknown>;
  bodyText(): Promise<string>;
  bodyFormData(): Promise<FormData>;
  bodyArrayBuffer(): Promise<ArrayBuffer>;
  bodyStream(): ReadableStream<Uint8Array> | null;
  parseBody(): Promise<unknown>;

  // Validation (when using request schemas)
  validated?: unknown;
};
```

## Core Methods

### `req.raw()`

Returns the underlying `Request` object from the Web API.

```typescript
app.get('/raw', {
  handler: (ctx) => {
    const request = ctx.req.raw();
    console.log('Request URL:', request.url);
    console.log('Request method:', request.method);

    return ctx.res.json({
      url: request.url,
      method: request.method,
    });
  },
});
```

**Use cases:**

- Accessing Web API features not wrapped by Kori
- Interacting with libraries that expect native Request objects
- Low-level request inspection

### `req.log()`

Returns a request-scoped logger with automatic context.

```typescript
app.get('/users/:id', {
  handler: async (ctx) => {
    const { id } = ctx.req.pathParams();

    ctx.req.log().info('Fetching user', { userId: id });

    try {
      const user = await getUser(id);
      ctx.req.log().info('User found', { userId: id, userName: user.name });
      return ctx.res.json({ user });
    } catch (error) {
      ctx.req
        .log()
        .error('Failed to fetch user', { userId: id, error: error.message });
      return ctx.res.notFound({ message: 'User not found' });
    }
  },
});
```

**Features:**

- Automatic request correlation
- Structured logging support
- Performance timing
- Error tracking

### `req.url()`

Returns the parsed URL object for the request.

```typescript
app.get('/info', {
  handler: (ctx) => {
    const url = ctx.req.url();

    return ctx.res.json({
      protocol: url.protocol,
      hostname: url.hostname,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      port: url.port,
    });
  },
});
```

**Common usage:**

```typescript
// Get specific URL parts
const pathname = ctx.req.url().pathname;
const origin = ctx.req.url().origin;
const searchParams = ctx.req.url().searchParams;

// Check URL patterns
if (ctx.req.url().pathname.startsWith('/api/')) {
  // API request handling
}
```

### `req.method()`

Returns the HTTP method as a string.

```typescript
app.addRoute(['GET', 'POST'], '/flexible', {
  handler: (ctx) => {
    const method = ctx.req.method();

    if (method === 'GET') {
      return ctx.res.json({ action: 'read' });
    } else {
      return ctx.res.json({ action: 'write' });
    }
  },
});
```

**Returns:** `'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'` etc.

## Parameters

### `req.pathParams()`

Returns path parameters extracted from the route.

```typescript
app.get('/users/:id/posts/:postId', {
  handler: (ctx) => {
    // Type-safe access to path parameters
    const { id, postId } = ctx.req.pathParams();

    // id and postId are typed as strings
    console.log('User ID:', id);
    console.log('Post ID:', postId);

    return ctx.res.json({ userId: id, postId });
  },
});
```

**With validation:**

```typescript
const ParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
  postId: z.uuid(),
});

app.get('/users/:id/posts/:postId', {
  requestSchema: zodRequestSchema({
    params: ParamsSchema,
  }),
  handler: (ctx) => {
    // ctx.req.validatedParams() contains validated/transformed values
    const { id, postId } = ctx.req.validatedParams();

    // id is number, postId is string (validated as UUID)
    return ctx.res.json({ userId: id, postId });
  },
});
```

### `req.queryParams()`

Returns query parameters as an object. Values can be strings or arrays for repeated parameters.

```typescript
app.get('/search', {
  handler: (ctx) => {
    const params = ctx.req.queryParams();

    return ctx.res.json({
      query: params.q, // string | string[] | undefined
      page: params.page, // string | string[] | undefined
      tags: params.tags, // string | string[] | undefined
    });
  },
});
```

**Example URLs:**

```
/search?q=kori&page=1
// { q: 'kori', page: '1' }

/search?tags=typescript&tags=web&tags=framework
// { tags: ['typescript', 'web', 'framework'] }

/search?q=kori&tags=typescript&tags=web
// { q: 'kori', tags: ['typescript', 'web'] }
```

**With validation and transformation:**

```typescript
const QuerySchema = z.object({
  q: z.string().min(1),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
  tags: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .optional(),
});

app.get('/search', {
  requestSchema: zodRequestSchema({
    queries: QuerySchema,
  }),
  handler: (ctx) => {
    const { q, page, limit, tags } = ctx.req.validatedQueries();

    // q: string
    // page: number (transformed)
    // limit: number (transformed)
    // tags: string[] | undefined (normalized to array)

    return ctx.res.json({ q, page, limit, tags });
  },
});
```

## Headers

### `req.headers()`

Returns all headers as a key-value object.

```typescript
app.get('/headers', {
  handler: (ctx) => {
    const headers = ctx.req.headers();

    return ctx.res.json({
      userAgent: headers['user-agent'],
      contentType: headers['content-type'],
      authorization: headers['authorization'],
      customHeader: headers['x-custom-header'],
      allHeaders: headers,
    });
  },
});
```

**Note:** Header names are lowercase in the returned object.

### `req.header(name)`

Returns a specific header value, or `undefined` if not present.

```typescript
app.get('/auth-info', {
  handler: (ctx) => {
    const authorization = ctx.req.header('authorization');
    const userAgent = ctx.req.header('user-agent');
    const apiVersion = ctx.req.header('x-api-version');

    if (!authorization) {
      return ctx.res.unauthorized({ message: 'Authorization header required' });
    }

    return ctx.res.json({
      hasAuth: !!authorization,
      userAgent: userAgent || 'unknown',
      apiVersion: apiVersion || 'v1',
    });
  },
});
```

**Type-safe header access:**

```typescript
// Common headers are typed
const contentType = ctx.req.header('content-type'); // string | undefined
const authorization = ctx.req.header('authorization'); // string | undefined
const userAgent = ctx.req.header('user-agent'); // string | undefined

// Custom headers
const customHeader = ctx.req.header('x-custom-header'); // string | undefined
```

### `req.fullContentType()`

Returns the complete Content-Type header value.

```typescript
app.post('/upload', {
  handler: (ctx) => {
    const fullContentType = ctx.req.fullContentType();

    // Examples:
    // "application/json; charset=utf-8"
    // "multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW"
    // "text/plain"

    return ctx.res.json({ fullContentType });
  },
});
```

### `req.contentType()`

Returns the parsed content type (without parameters).

```typescript
app.post('/data', {
  handler: async (ctx) => {
    const contentType = ctx.req.contentType();

    switch (contentType) {
      case 'application/json':
        const jsonData = await ctx.req.bodyJson();
        return ctx.res.json({ type: 'json', data: jsonData });

      case 'application/x-www-form-urlencoded':
        const formData = await ctx.req.bodyFormData();
        return ctx.res.json({
          type: 'form',
          data: Object.fromEntries(formData),
        });

      case 'text/plain':
        const text = await ctx.req.bodyText();
        return ctx.res.json({ type: 'text', data: text });

      default:
        return ctx.res.badRequest({ message: 'Unsupported content type' });
    }
  },
});
```

**Common content types:**

- `'application/json'`
- `'application/x-www-form-urlencoded'`
- `'multipart/form-data'`
- `'text/plain'`
- `'text/html'`
- `'application/octet-stream'`

## Cookies

### `req.cookies()`

Returns all cookies as a key-value object.

```typescript
app.get('/cookie-info', {
  handler: (ctx) => {
    const cookies = ctx.req.cookies();

    return ctx.res.json({
      sessionId: cookies.sessionId,
      theme: cookies.theme,
      allCookies: cookies,
    });
  },
});
```

### `req.cookie(name)`

Returns a specific cookie value, or `undefined` if not present.

```typescript
app.get('/session', {
  handler: (ctx) => {
    const sessionId = ctx.req.cookie('sessionId');
    const theme = ctx.req.cookie('theme') || 'light';

    if (!sessionId) {
      return ctx.res.unauthorized({ message: 'Session required' });
    }

    return ctx.res.json({
      sessionId,
      theme,
      isAuthenticated: true,
    });
  },
});
```

#### Cookie parsing behavior

Cookie parsing is lenient and never throws. Malformed pairs are skipped.

```typescript
app.get('/cookies', {
  handler: (ctx) => {
    const all = ctx.req.cookies();
    const sessionId = ctx.req.cookie('sessionId');
    return ctx.res.json({ all, sessionId });
  },
});
```

**Cookie validation:**

```typescript
const CookieSchema = z.object({
  sessionId: z.uuid(),
  theme: z.enum(['light', 'dark']).default('light'),
  language: z.string().length(2).default('en'),
});

app.get('/preferences', {
  requestSchema: zodRequestSchema({
    cookies: CookieSchema,
  }),
  handler: (ctx) => {
    const { sessionId, theme, language } = ctx.req.validatedCookies();

    return ctx.res.json({ sessionId, theme, language });
  },
});
```

## Body Parsing

### `req.bodyJson()`

Parses the request body as JSON.

```typescript
app.post('/users', {
  handler: async (ctx) => {
    try {
      const userData = await ctx.req.bodyJson();

      // userData is unknown, needs validation
      const user = await createUser(userData);

      return ctx.res.status(201).json({ user });
    } catch (error) {
      return ctx.res.badRequest({ message: 'Invalid JSON' });
    }
  },
});
```

**Type-safe with validation:**

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
    // No need for bodyJson() - validation handles parsing
    const userData = ctx.req.validatedBody();

    // userData is fully typed from schema
    return ctx.res.json({
      message: `Hello ${userData.name}`,
      age: userData.age,
    });
  },
});
```

### `req.bodyText()`

Parses the request body as plain text.

```typescript
app.post('/webhook', {
  handler: async (ctx) => {
    const payload = await ctx.req.bodyText();

    // Verify webhook signature
    const signature = ctx.req.header('x-signature');
    if (!verifySignature(payload, signature)) {
      return ctx.res.unauthorized({ message: 'Invalid signature' });
    }

    // Process webhook
    await processWebhook(payload);

    return ctx.res.json({ received: true });
  },
});
```

### `req.bodyFormData()`

Parses the request body as FormData (for file uploads and form submissions).

```typescript
app.post('/upload', {
  handler: async (ctx) => {
    const formData = await ctx.req.bodyFormData();

    // Get form fields
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    // Get uploaded files
    const avatar = formData.get('avatar') as File;
    const attachments = formData.getAll('attachments') as File[];

    if (avatar) {
      console.log(`Avatar: ${avatar.name} (${avatar.size} bytes)`);
    }

    console.log(`Attachments: ${attachments.length} files`);

    return ctx.res.json({
      title,
      description,
      avatarSize: avatar?.size || 0,
      attachmentCount: attachments.length,
    });
  },
});
```

**FormData validation:**

```typescript
const UploadSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  avatar: z.instanceof(File),
  attachments: z.array(z.instanceof(File)).optional(),
});

app.post('/upload', {
  requestSchema: zodRequestSchema({
    body: UploadSchema,
  }),
  handler: (ctx) => {
    const { title, description, avatar, attachments } = ctx.req.validatedBody();

    // All fields are properly typed and validated
    return ctx.res.json({
      title,
      description,
      avatarName: avatar.name,
      attachmentCount: attachments?.length || 0,
    });
  },
});
```

### `req.bodyArrayBuffer()`

Returns the request body as an ArrayBuffer for binary data.

```typescript
app.post('/binary', {
  handler: async (ctx) => {
    const buffer = await ctx.req.bodyArrayBuffer();

    // Process binary data
    const uint8Array = new Uint8Array(buffer);
    const size = buffer.byteLength;

    // Example: Save to file
    await fs.writeFile('/tmp/upload.bin', uint8Array);

    return ctx.res.json({
      received: true,
      size,
      type: 'binary',
    });
  },
});
```

### `req.bodyStream()`

Returns a ReadableStream for processing large request bodies.

```typescript
app.post('/stream', {
  handler: async (ctx) => {
    const stream = ctx.req.bodyStream();

    if (!stream) {
      return ctx.res.badRequest({ message: 'No request body' });
    }

    const reader = stream.getReader();
    let totalSize = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        totalSize += value.length;
        // Process chunk
        await processChunk(value);
      }

      return ctx.res.json({
        processed: true,
        totalSize,
      });
    } finally {
      reader.releaseLock();
    }
  },
});
```

### `req.parseBody()`

Automatically parses the request body based on Content-Type.

```typescript
app.post('/auto', {
  handler: async (ctx) => {
    const body = await ctx.req.parseBody();

    // Body is parsed based on Content-Type:
    // - application/json → object
    // - application/x-www-form-urlencoded → URLSearchParams
    // - multipart/form-data → FormData
    // - text/* → string
    // - default → ArrayBuffer

    return ctx.res.json({
      type: typeof body,
      isFormData: body instanceof FormData,
      isURLSearchParams: body instanceof URLSearchParams,
      data: body instanceof FormData ? 'FormData object' : body,
    });
  },
});
```

## Validation Integration

When using request schemas, validated data is available in `req.validated`:

```typescript
const RequestSchema = zodRequestSchema({
  params: z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
  }),
  queries: z.object({
    include: z.array(z.string()).optional(),
  }),
  headers: z.object({
    authorization: z.string().regex(/^Bearer .+$/),
  }),
  body: z.object({
    name: z.string().min(1),
    age: z.number().int().min(0),
  }),
});

app.post('/users/:id', {
  requestSchema: RequestSchema,
  handler: (ctx) => {
    // All validated data is available
    const { id } = ctx.req.validatedParams(); // number
    const { include } = ctx.req.validatedQueries(); // string[] | undefined
    const { authorization } = ctx.req.validatedHeaders(); // string
    const { name, age } = ctx.req.validatedBody(); // { name: string, age: number }

    return ctx.res.json({
      userId: id,
      userData: { name, age },
      include,
      hasAuth: !!authorization,
    });
  },
});
```

## Advanced Patterns

### Content Negotiation

```typescript
app.post('/data', {
  handler: async (ctx) => {
    const contentType = ctx.req.contentType();
    const accept = ctx.req.header('accept');

    let data: unknown;

    // Parse based on content type
    switch (contentType) {
      case 'application/json':
        data = await ctx.req.bodyJson();
        break;
      case 'application/xml':
        const xml = await ctx.req.bodyText();
        data = parseXML(xml);
        break;
      default:
        return ctx.res.badRequest({ message: 'Unsupported content type' });
    }

    // Respond based on accept header
    if (accept?.includes('application/xml')) {
      return ctx.res
        .setHeader('content-type', 'application/xml')
        .text(serializeToXML(data));
    } else {
      return ctx.res.json(data);
    }
  },
});
```

### Request Logging

```typescript
const appWithTiming = app.onRequest((ctx) => {
  ctx.req.log().info('Request started', {
    method: ctx.req.method(),
    path: ctx.req.url().pathname,
    userAgent: ctx.req.header('user-agent'),
    contentType: ctx.req.contentType(),
  });

  return ctx.withReq({ startTime: Date.now() });
});

appWithTiming.onResponse((ctx) => {
  const duration = Date.now() - ctx.req.startTime;

  ctx.req.log().info('Request completed', {
    status: ctx.res.getStatus(),
    duration,
  });
});
```

### Conditional Body Parsing

```typescript
app.post('/smart-upload', {
  handler: async (ctx) => {
    const contentType = ctx.req.contentType();
    const contentLength = ctx.req.header('content-length');

    // Handle large uploads differently
    if (contentLength && parseInt(contentLength) > 10_000_000) {
      // Stream large files
      const stream = ctx.req.bodyStream();
      return processLargeUpload(stream);
    }

    // Handle normal uploads
    if (contentType === 'multipart/form-data') {
      const formData = await ctx.req.bodyFormData();
      return processFormUpload(formData);
    } else {
      const json = await ctx.req.bodyJson();
      return processJsonUpload(json);
    }
  },
});
```

## Performance Tips

### 1. Parse Body Only Once

```typescript
// Good: Parse once, use multiple times
app.post('/process', {
  handler: async (ctx) => {
    const data = await ctx.req.bodyJson();

    await validateData(data);
    await saveData(data);
    await notifyUsers(data);

    return ctx.res.json({ processed: true });
  },
});

// Avoid: Multiple parsing calls
app.post('/process', {
  handler: async (ctx) => {
    await validateData(await ctx.req.bodyJson()); // Parsed again
    await saveData(await ctx.req.bodyJson()); // Parsed again
    await notifyUsers(await ctx.req.bodyJson()); // Parsed again

    return ctx.res.json({ processed: true });
  },
});
```

### 2. Use Validation for Type Safety

```typescript
// Good: Validation + typing
const UserSchema = z.object({
  name: z.string(),
  age: z.number().int().min(0),
});

app.post('/users', {
  requestSchema: zodRequestSchema({ body: UserSchema }),
  handler: (ctx) => {
    // Type-safe, validated data
    const user = ctx.req.validatedBody();
    return ctx.res.json({ user });
  },
});

// Avoid: Manual parsing + casting
app.post('/users', {
  handler: async (ctx) => {
    const data = await ctx.req.bodyJson();
    const user = data as { name: string; age: number }; // Unsafe
    return ctx.res.json({ user });
  },
});
```

### 3. Stream Large Bodies

```typescript
// Good: Stream processing for large data
app.post('/large-file', {
  handler: async (ctx) => {
    const stream = ctx.req.bodyStream();
    if (!stream) {
      return ctx.res.badRequest({ message: 'No body' });
    }

    return processStreamingUpload(stream);
  },
});

// Avoid: Loading large data into memory
app.post('/large-file', {
  handler: async (ctx) => {
    const buffer = await ctx.req.bodyArrayBuffer(); // Loads entire file
    return processBuffer(buffer);
  },
});
```

## Next Steps

- [Response API Reference](/en/core/response) - Response building methods
- [Context API Reference](/en/core/context) - Handler context documentation
- [Validation Guide](/en/guide/validation) - Request validation patterns
- [Hooks Guide](/en/guide/hooks) - Request processing lifecycle

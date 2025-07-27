# Getting Started

Ready to build your first type-safe API? Let's get you up and running in **under 5 minutes**! ⚡

## Create Your First API

### 1. Install Kori

```bash
npm install @korix/kori @korix/nodejs-adapter
```

### 2. Write Your API

Create `app.ts` and add this code:

```typescript
import { createKori, HttpStatus } from '@korix/kori';
import { startNodeServer } from '@korix/nodejs-adapter';

const app = createKori();

// Your first endpoint - that's it! 🎉
app.get('/hello', (ctx) => {
  return ctx.res.text('Hello, World! 🚀');
});

app.get('/users/:id', (ctx) => {
  const { id } = ctx.req.pathParams;
  return ctx.res.json({
    userId: id,
    message: `Hello user ${id}!`,
    timestamp: new Date().toISOString(),
  });
});

// Start the server
startNodeServer(app, { port: 3000 });
```

### 3. Start Your Server

```bash
npx tsx app.ts
```

**🎉 Done!** Your API is running at `http://localhost:3000`

Test it:

```bash
curl http://localhost:3000/hello
curl http://localhost:3000/users/123
```

## What Makes This Special?

### Zero Configuration Required

No config files, no setup - just write code and it works.

### Type Safety Built-In

Path parameters like `:id` are automatically typed and available in `ctx.req.pathParams`.

### Production Ready

This isn't just a toy - add plugins for CORS, validation, authentication, and more.

## Level Up: Add Validation

```typescript
import { zodRequestSchema } from '@korix/zod-schema';
import { createKoriZodRequestValidator } from '@korix/zod-validator';
import { z } from 'zod/v4';

const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
});

const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(18).optional(),
});

app.post('/users', {
  requestSchema: zodRequestSchema({
    body: UserSchema,
  }),
  handler: (ctx) => {
    // ctx.req.validated.body is fully typed and validated! ✨
    const { name, email, age } = ctx.req.validated.body;

    return ctx.res.status(HttpStatus.CREATED).json({
      user: { name, email, age },
      message: 'User created successfully!',
    });
  },
});
```

➡️ [Learn More About Validation](/en/guide/validation) - Turn your API into a type-safe fortress!

## Generate Beautiful Documentation

Want automatic, interactive API documentation? Here's a complete example:

```typescript
import { createKori, HttpStatus } from '@korix/kori';
import { startNodeServer } from '@korix/nodejs-adapter';
import { zodRequestSchema } from '@korix/zod-schema';
import { createKoriZodRequestValidator } from '@korix/zod-validator';
import { zodOpenApiPlugin, openApiMeta } from '@korix/zod-openapi-plugin';
import { scalarUiPlugin } from '@korix/openapi-scalar-ui-plugin';
import { z } from 'zod/v4';

const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(18).optional(),
});

const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
})
  .applyPlugin(
    zodOpenApiPlugin({
      info: { title: 'My API', version: '1.0.0' },
    }),
  )
  .applyPlugin(scalarUiPlugin({ path: '/docs' }));

app.post('/users', {
  requestSchema: zodRequestSchema({ body: UserSchema }),
  pluginMetadata: openApiMeta({
    summary: 'Create user',
    tags: ['Users'],
  }),
  handler: (ctx) => {
    const { name, email, age } = ctx.req.validated.body;
    return ctx.res.status(HttpStatus.CREATED).json({
      user: { name, email, age },
      message: 'User created!',
    });
  },
});

startNodeServer(app, { port: 3000 });
```

Visit `http://localhost:3000/docs` for interactive documentation! 📖✨

Features you get for free:

- ✅ Full TypeScript type safety
- ✅ Automatic request validation
- ✅ Beautiful interactive documentation at `/docs`
- ✅ Detailed error responses
- ✅ Production-ready performance

➡️ [Learn More About OpenAPI](/en/guide/openapi) - Advanced documentation features

## CLI Tool (Coming Soon!)

We're working on a CLI tool to make this even easier:

```bash
npm create kori-app my-api  # 🚧 Coming Soon!
```

For now, the manual setup above is quick and gives you full control.

## What's Next?

### 🎯 Essential Guides

- [Validation](/en/guide/validation) - Master type-safe validation (highly recommended!)
- [OpenAPI](/en/guide/openapi) - Auto-generate beautiful documentation
- [Request & Response](/en/guide/request-response) - Handle HTTP like a pro

### 🔧 Advanced Topics

- [Plugins](/en/guide/plugins) - Extend Kori with reusable functionality
- [Hooks](/en/guide/hooks) - Add middleware-like behavior
- [Error Handling](/en/guide/error-handling) - Robust error management

### 💡 Real Examples

- [Basic Server](/en/examples/basic-server) - Complete server example
- [REST API](/en/examples/rest-api) - Full REST API with validation
- [File Upload](/en/examples/file-upload) - Handle file uploads

### 📚 API Reference

- [Core API](/en/core/kori) - Main Kori methods
- [Context](/en/core/context) - Request context handling
- [Request](/en/core/request) - Request object methods
- [Response](/en/core/response) - Response building methods

Ready to build something amazing? Start with [Validation](/en/guide/validation) or explore our [Examples](/en/examples/)! 🚀

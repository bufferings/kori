# REST API Example

Build a complete REST API with CRUD operations, request validation, authentication, error handling, and OpenAPI documentation.

## Complete Example

```typescript
import { createKori, HttpStatus } from '@korix/kori';
import { startNodeServer } from '@korix/nodejs-adapter';
import { corsPlugin } from '@korix/cors-plugin';
import { bodyLimitPlugin } from '@korix/body-limit-plugin';
import { securityHeadersPlugin } from '@korix/security-headers-plugin';
import { zodOpenApiPlugin, openApiMeta } from '@korix/zod-openapi-plugin';
import { scalarUiPlugin } from '@korix/openapi-scalar-ui-plugin';
import { zodRequestSchema } from '@korix/zod-schema';
import { createKoriZodRequestValidator, createKoriZodResponseValidator } from '@korix/zod-validator';
import { z } from 'zod/v4';

// Data schemas
const UserSchema = z.object({
  name: z.string().min(1).max(100).meta({ description: 'User full name' }),
  email: z.string().email().meta({ description: 'Email address' }),
  age: z.number().min(0).max(150).optional().meta({ description: 'User age' }),
});

const UpdateUserSchema = UserSchema.partial();

const QueryParamsSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
  search: z.string().optional(),
});

// In-memory database (use real database in production)
type User = z.infer<typeof UserSchema> & { id: string; createdAt: string; updatedAt: string };
const users: User[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    age: 30,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    age: 25,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

// Create Kori app with validation
const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
  responseValidator: createKoriZodResponseValidator(),
})
  // Add middleware
  .applyPlugin(
    corsPlugin({
      origin: ['http://localhost:3000', 'http://localhost:8080'],
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    }),
  )
  .applyPlugin(bodyLimitPlugin({ maxSize: '1mb' }))
  .applyPlugin(securityHeadersPlugin())

  // Add OpenAPI documentation
  .applyPlugin(
    zodOpenApiPlugin({
      info: {
        title: 'Users REST API',
        version: '1.0.0',
        description: 'A complete REST API example with CRUD operations',
      },
      servers: [{ url: 'http://localhost:3000', description: 'Development server' }],
    }),
  )
  .applyPlugin(
    scalarUiPlugin({
      path: '/docs',
      title: 'Users API Documentation',
    }),
  )

  // Global request logging
  .onRequest((ctx) => {
    ctx.req.log().info('API Request', {
      method: ctx.req.method(),
      path: ctx.req.url().pathname,
      userAgent: ctx.req.header('user-agent'),
    });
    return ctx;
  })

  // Global error handling
  .onError((ctx, error) => {
    ctx.req.log().error('API Error', {
      error: error.message,
      stack: error.stack,
    });

    if (!ctx.res.isReady()) {
      ctx.res.internalError({ message: 'Internal server error' });
    }
  });

// API Routes

// Get all users with pagination and search
app.get('/api/users', {
  pluginMetadata: openApiMeta({
    summary: 'Get all users',
    description: 'Retrieve a paginated list of users with optional search',
    tags: ['Users'],
  }),
  requestSchema: zodRequestSchema({
    queries: QueryParamsSchema,
  }),
  handler: (ctx) => {
    const { page, limit, search } = ctx.req.validatedQueries();

    let filteredUsers = users;

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = users.filter(
        (user) => user.name.toLowerCase().includes(searchLower) || user.email.toLowerCase().includes(searchLower),
      );
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    return ctx.res.json({
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        total: filteredUsers.length,
        pages: Math.ceil(filteredUsers.length / limit),
      },
      search,
    });
  },
});

// Get user by ID
app.get('/api/users/:id', {
  pluginMetadata: openApiMeta({
    summary: 'Get user by ID',
    description: 'Retrieve a specific user by their ID',
    tags: ['Users'],
  }),
  handler: (ctx) => {
    const { id } = ctx.req.pathParams();
    const user = users.find((u) => u.id === id);

    if (!user) {
      return ctx.res.notFound({ message: 'User not found' });
    }

    return ctx.res.json({ user });
  },
});

// Create new user
app.post('/api/users', {
  pluginMetadata: openApiMeta({
    summary: 'Create user',
    description: 'Create a new user with validation',
    tags: ['Users'],
  }),
  requestSchema: zodRequestSchema({
    body: UserSchema,
  }),
  handler: (ctx) => {
    const userData = ctx.req.validatedBody();

    // Check if email already exists
    const existingUser = users.find((u) => u.email === userData.email);
    if (existingUser) {
      return ctx.res.badRequest({
        message: 'Email already exists',
        field: 'email',
      });
    }

    // Create new user
    const newUser: User = {
      id: (users.length + 1).toString(),
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users.push(newUser);

    ctx.req.log().info('User created', { userId: newUser.id });

    return ctx.res.status(HttpStatus.CREATED).json({ user: newUser });
  },
});

// Update user
app.put('/api/users/:id', {
  pluginMetadata: openApiMeta({
    summary: 'Update user',
    description: 'Update an existing user completely',
    tags: ['Users'],
  }),
  requestSchema: zodRequestSchema({
    body: UserSchema,
  }),
  handler: (ctx) => {
    const { id } = ctx.req.pathParams();
    const userData = ctx.req.validatedBody();

    const userIndex = users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      return ctx.res.notFound({ message: 'User not found' });
    }

    // Check email uniqueness (excluding current user)
    const existingUser = users.find((u) => u.email === userData.email && u.id !== id);
    if (existingUser) {
      return ctx.res.badRequest({
        message: 'Email already exists',
        field: 'email',
      });
    }

    // Update user
    users[userIndex] = {
      ...users[userIndex],
      ...userData,
      updatedAt: new Date().toISOString(),
    };

    ctx.req.log().info('User updated', { userId: id });

    return ctx.res.json({ user: users[userIndex] });
  },
});

// Partial update user
app.patch('/api/users/:id', {
  pluginMetadata: openApiMeta({
    summary: 'Partially update user',
    description: 'Update specific fields of an existing user',
    tags: ['Users'],
  }),
  requestSchema: zodRequestSchema({
    body: UpdateUserSchema,
  }),
  handler: (ctx) => {
    const { id } = ctx.req.pathParams();
    const updates = ctx.req.validatedBody();

    const userIndex = users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      return ctx.res.notFound({ message: 'User not found' });
    }

    // Check email uniqueness if email is being updated
    if (updates.email) {
      const existingUser = users.find((u) => u.email === updates.email && u.id !== id);
      if (existingUser) {
        return ctx.res.badRequest({
          message: 'Email already exists',
          field: 'email',
        });
      }
    }

    // Apply partial update
    users[userIndex] = {
      ...users[userIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    ctx.req.log().info('User partially updated', { userId: id });

    return ctx.res.json({ user: users[userIndex] });
  },
});

// Delete user
app.delete('/api/users/:id', {
  pluginMetadata: openApiMeta({
    summary: 'Delete user',
    description: 'Delete an existing user',
    tags: ['Users'],
  }),
  handler: (ctx) => {
    const { id } = ctx.req.pathParams();

    const userIndex = users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      return ctx.res.notFound({ message: 'User not found' });
    }

    const deletedUser = users[userIndex];
    users.splice(userIndex, 1);

    ctx.req.log().info('User deleted', { userId: id });

    return ctx.res.json({
      message: 'User deleted successfully',
      user: deletedUser,
    });
  },
});

// Health check
app.get('/health', {
  pluginMetadata: openApiMeta({
    summary: 'Health check',
    description: 'Check API health status',
    tags: ['System'],
  }),
  handler: (ctx) => {
    return ctx.res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      users: users.length,
    });
  },
});

// Start the server
await startNodeServer(app, {
  port: 3000,
  hostname: 'localhost',
});

console.log('🚀 REST API Server running on http://localhost:3000');
console.log('📚 API Documentation available at http://localhost:3000/docs');
```

## Key Features Demonstrated

### 1. Request Validation with Zod

```typescript
// Define schema
const UserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().min(0).max(150).optional(),
});

// Use in route
app.post('/api/users', {
  requestSchema: zodRequestSchema({
    body: UserSchema,
  }),
  handler: (ctx) => {
    // ctx.req.validatedBody() is fully typed and validated
    const { name, email, age } = ctx.req.validatedBody();
    // ...
  },
});
```

### 2. Error Handling Patterns

```typescript
// Not found
app.get('/api/users/:id', {
  handler: (ctx) => {
    const user = findUser(ctx.req.pathParams().id);
    if (!user) {
      return ctx.res.notFound({ message: 'User not found' });
    }
    return ctx.res.json({ user });
  },
});

// Validation errors
app.post('/api/users', {
  handler: (ctx) => {
    const existingUser = users.find((u) => u.email === userData.email);
    if (existingUser) {
      return ctx.res.badRequest({
        message: 'Email already exists',
        field: 'email',
      });
    }
    // ...
  },
});
```

### 3. Pagination and Search

```typescript
app.get('/api/users', {
  requestSchema: zodRequestSchema({
    queries: z.object({
      page: z.string().regex(/^\d+$/).transform(Number).default('1'),
      limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
      search: z.string().optional(),
    }),
  }),
  handler: (ctx) => {
    const { page, limit, search } = ctx.req.validatedQueries();

    let results = users;

    // Apply search
    if (search) {
      results = users.filter((user) => user.name.toLowerCase().includes(search.toLowerCase()));
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedResults = results.slice(startIndex, startIndex + limit);

    return ctx.res.json({
      users: paginatedResults,
      pagination: {
        page,
        limit,
        total: results.length,
        pages: Math.ceil(results.length / limit),
      },
    });
  },
});
```

## Testing the API

### Using curl

```bash
# Get all users
curl http://localhost:3000/api/users

# Get users with pagination
curl "http://localhost:3000/api/users?page=1&limit=5"

# Search users
curl "http://localhost:3000/api/users?search=alice"

# Get specific user
curl http://localhost:3000/api/users/1

# Create user
curl -X POST http://localhost:3000/api/users \
  -H "content-type: application/json" \
  -d '{
    "name": "Charlie Brown",
    "email": "charlie@example.com",
    "age": 28
  }'

# Update user
curl -X PUT http://localhost:3000/api/users/1 \
  -H "content-type: application/json" \
  -d '{
    "name": "Alice Johnson Updated",
    "email": "alice.updated@example.com",
    "age": 31
  }'

# Partial update
curl -X PATCH http://localhost:3000/api/users/1 \
  -H "content-type: application/json" \
  -d '{"age": 32}'

# Delete user
curl -X DELETE http://localhost:3000/api/users/1
```

### Using JavaScript/TypeScript

```typescript
const API_BASE = 'http://localhost:3000/api';

class UsersAPI {
  async getUsers(params?: { page?: number; limit?: number; search?: string }) {
    const url = new URL(`${API_BASE}/users`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, value.toString());
        }
      });
    }

    const response = await fetch(url);
    return response.json();
  }

  async getUser(id: string) {
    const response = await fetch(`${API_BASE}/users/${id}`);
    if (!response.ok) {
      throw new Error(`User not found: ${id}`);
    }
    return response.json();
  }

  async createUser(user: { name: string; email: string; age?: number }) {
    const response = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(user),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  }

  async updateUser(id: string, user: { name: string; email: string; age?: number }) {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(user),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  }

  async deleteUser(id: string) {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete user: ${id}`);
    }

    return response.json();
  }
}

// Usage
const api = new UsersAPI();

try {
  // Get all users
  const users = await api.getUsers();
  console.log('Users:', users);

  // Create user
  const newUser = await api.createUser({
    name: 'David Wilson',
    email: 'david@example.com',
    age: 35,
  });
  console.log('Created:', newUser);

  // Search users
  const searchResults = await api.getUsers({ search: 'alice' });
  console.log('Search results:', searchResults);
} catch (error) {
  console.error('API Error:', error.message);
}
```

## Advanced Patterns

### Authentication Middleware

```typescript
// Simple API key authentication
const authRoutes = app.createChild({
  prefix: '/api/v2',
  configure: (k) =>
    k
      .onRequest((ctx) => {
        const apiKey = ctx.req.header('x-api-key');

        if (!apiKey || apiKey !== 'secret-api-key') {
          throw new Error('Invalid API key');
        }

        return ctx.withReq({ authenticated: true });
      })
      .onError((ctx, err) => {
        if (err instanceof Error && err.message === 'Invalid API key') {
          return ctx.res.unauthorized({
            message: 'Valid API key required',
            hint: 'Include x-api-key header',
          });
        }
      }),
});

authRoutes.get('/users', {
  handler: (ctx) => {
    // Only authenticated requests reach here
    return ctx.res.json({ users: users });
  },
});
```

### Rate Limiting

```typescript
// Simple rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const rateLimitPlugin = () =>
  defineKoriPlugin({
    name: 'rate-limit',
    apply: (kori) =>
      kori
        .onRequest((ctx) => {
          const clientId = ctx.req.header('x-forwarded-for') || 'unknown';
          const now = Date.now();
          const windowMs = 60 * 1000; // 1 minute
          const maxRequests = 100;

          const record = rateLimitStore.get(clientId);

          if (!record || now > record.resetTime) {
            rateLimitStore.set(clientId, {
              count: 1,
              resetTime: now + windowMs,
            });
            return ctx;
          }

          if (record.count >= maxRequests) {
            throw new Error('Rate limit exceeded');
          }

          record.count++;
          return ctx;
        })
        .onError((ctx, err) => {
          if (err instanceof Error && err.message === 'Rate limit exceeded') {
            return ctx.res.status(429).json({
              message: 'Too many requests',
              retryAfter: 60,
            });
          }
        }),
  });
```

### Response Caching

```typescript
// Simple response caching
const cache = new Map<string, { data: any; expiry: number }>();

app.get('/api/users/:id', {
  handler: (ctx) => {
    const { id } = ctx.req.pathParams();
    const cacheKey = `user:${id}`;
    const cached = cache.get(cacheKey);

    // Return cached response if valid
    if (cached && Date.now() < cached.expiry) {
      ctx.res.setHeader('x-cache', 'HIT');
      return ctx.res.json(cached.data);
    }

    // Find user
    const user = users.find((u) => u.id === id);
    if (!user) {
      return ctx.res.notFound({ message: 'User not found' });
    }

    // Cache response for 5 minutes
    const responseData = { user };
    cache.set(cacheKey, {
      data: responseData,
      expiry: Date.now() + 5 * 60 * 1000,
    });

    return ctx.res.setHeader('x-cache', 'MISS').setHeader('cache-control', 'public, max-age=300').json(responseData);
  },
});
```

## Production Considerations

### Database Integration

```typescript
// Example with a real database
import { drizzle } from 'drizzle-orm/node-postgres';
import { users as usersTable } from './schema';

const db = drizzle(connectionString);

app.get('/api/users', {
  handler: async (ctx) => {
    const { page, limit, search } = ctx.req.validatedQueries();

    let query = db.select().from(usersTable);

    if (search) {
      query = query.where(or(ilike(usersTable.name, `%${search}%`), ilike(usersTable.email, `%${search}%`)));
    }

    const users = await query.limit(limit).offset((page - 1) * limit);

    return ctx.res.json({ users });
  },
});
```

### Environment Configuration

```typescript
const config = {
  port: parseInt(process.env.PORT || '3000'),
  database: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  isDev: process.env.NODE_ENV !== 'production',
};

const app = createKori().applyPlugin(
  corsPlugin({
    origin: config.isDev ? true : process.env.ALLOWED_ORIGINS?.split(','),
    credentials: true,
  }),
);
```

### Error Monitoring

```typescript
app.onError((ctx, error) => {
  // Log to monitoring service
  console.error('API Error:', {
    error: error.message,
    stack: error.stack,
    path: ctx.req.url().pathname,
    method: ctx.req.method(),
    userAgent: ctx.req.header('user-agent'),
    timestamp: new Date().toISOString(),
  });

  // Send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Sentry.captureException(error);
  }
});
```

## Next Steps

- [File Upload Example](/en/examples/file-upload) - Handle file uploads in REST APIs
- [Authentication with Plugins](/en/guide/plugins) - Implement JWT authentication plugins
- [CORS Plugin](/en/extensions/cors-plugin) - Learn about CORS configuration

import { createKori } from 'kori';
import { openApiRoute } from 'kori-zod-openapi-plugin';
import { zodRequest } from 'kori-zod-schema';
import { createKoriZodRequestValidator } from 'kori-zod-validator';
import { z } from 'zod';

const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
});

const UserSchema = z.object({
  id: z.number().int().positive().describe('User ID'),
  name: z.string().min(1).max(100).describe('User full name'),
  email: z.string().email().describe('User email address'),
  role: z.enum(['admin', 'user', 'guest']).describe('User role'),
  createdAt: z.string().datetime().describe('User creation timestamp'),
});

const CreateUserSchema = UserSchema.omit({ id: true, createdAt: true });

app.addRoute({
  method: 'GET',
  path: '/users',
  requestSchema: zodRequest({
    queries: z.object({
      page: z.string().regex(/^\d+$/).transform(Number).default('1').describe('Page number'),
      pageSize: z.string().regex(/^\d+$/).transform(Number).default('10').describe('Items per page'),
      role: z.enum(['admin', 'user', 'guest']).optional().describe('Filter by role'),
    }),
  }),
  pluginMetadata: openApiRoute({
    summary: 'List all users',
    description: 'Retrieve a paginated list of all users in the system',
    tags: ['Users'],
  }),
  handler: (ctx) => {
    const query = ctx.req.validated.queries;
    const users = [
      {
        id: 1,
        name: 'Alice Johnson',
        email: 'alice@example.com',
        role: 'admin' as const,
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 2,
        name: 'Bob Smith',
        email: 'bob@example.com',
        role: 'user' as const,
        createdAt: '2024-01-02T00:00:00Z',
      },
    ];

    const filteredUsers = query.role ? users.filter((u) => u.role === query.role) : users;

    return ctx.res.json({
      users: filteredUsers.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
      total: filteredUsers.length,
      page: query.page,
      pageSize: query.pageSize,
    });
  },
});

app.addRoute({
  method: 'GET',
  path: '/users/:id',
  requestSchema: zodRequest({
    params: z.object({
      id: z.string().regex(/^\d+$/).describe('User ID'),
    }),
  }),
  pluginMetadata: openApiRoute({
    summary: 'Get user by ID',
    description: 'Retrieve a specific user by their ID',
    tags: ['Users'],
  }),
  handler: (ctx) => {
    const { id } = ctx.req.validated.params;

    if (id === '1') {
      return ctx.res.json({
        id: 1,
        name: 'Alice Johnson',
        email: 'alice@example.com',
        role: 'admin' as const,
        createdAt: '2024-01-01T00:00:00Z',
      });
    }

    return ctx.res.notFound({
      message: `User with ID ${id} not found`,
    });
  },
});

app.addRoute({
  method: 'POST',
  path: '/users',
  requestSchema: zodRequest({
    body: CreateUserSchema,
  }),
  pluginMetadata: openApiRoute({
    summary: 'Create a new user',
    description: 'Create a new user in the system',
    tags: ['Users'],
  }),
  handler: (ctx) => {
    const body = ctx.req.validated.body;
    const newUser = {
      id: Math.floor(Math.random() * 1000),
      ...body,
      createdAt: new Date().toISOString(),
    };
    return ctx.res.status(201).json(newUser);
  },
});

app.addRoute({
  method: 'DELETE',
  path: '/users/:id',
  requestSchema: zodRequest({
    params: z.object({
      id: z.string().regex(/^\d+$/).describe('User ID'),
    }),
  }),
  pluginMetadata: openApiRoute({
    summary: 'Delete user by ID',
    description: 'Delete a specific user by their ID',
    tags: ['Users'],
  }),
  handler: (ctx) => {
    const { id } = ctx.req.validated.params;

    if (id === '999') {
      return ctx.res.notFound({
        message: `User with ID ${id} not found`,
      });
    }

    return ctx.res.empty(204);
  },
});

export default app;

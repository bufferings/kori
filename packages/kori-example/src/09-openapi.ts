/**
 * Kori OpenAPI Integration Guide
 *
 * This file demonstrates OpenAPI integration capabilities including:
 * - Schema-driven API development with Zod
 * - OpenAPI metadata and documentation
 * - Request/response validation
 * - Type-safe route handlers with validation
 */

import { type Kori, type KoriEnvironment, type KoriRequest, type KoriResponse } from 'kori';
import { openApiRoute } from 'kori-zod-openapi-plugin';
import { zodRequest } from 'kori-zod-schema';
import { type KoriZodRequestValidator, type KoriZodResponseValidator } from 'kori-zod-validator';
import { z } from 'zod';

/**
 * Configure OpenAPI example routes
 * This demonstrates OpenAPI integration with Zod validation
 */
export function configure<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(
  k: Kori<Env, Req, Res, KoriZodRequestValidator, KoriZodResponseValidator>,
): Kori<Env, Req, Res, KoriZodRequestValidator, KoriZodResponseValidator> {
  // Schema definitions
  const UserSchema = z.object({
    id: z.number().int().positive().describe('User ID'),
    name: z.string().min(1).max(100).describe('User full name'),
    email: z.string().email().describe('User email address'),
    role: z.enum(['admin', 'user', 'guest']).describe('User role'),
    createdAt: z.string().datetime().describe('User creation timestamp'),
  });

  const CreateUserSchema = UserSchema.omit({ id: true, createdAt: true });

  // Welcome route
  k.get('/', (ctx) =>
    ctx.res.json({
      message: 'Welcome to Kori OpenAPI Examples!',
      description: 'This demonstrates OpenAPI integration with Zod validation',
      features: [
        'Schema-driven API development',
        'OpenAPI metadata generation',
        'Request/response validation',
        'Type-safe route handlers',
      ],
      endpoints: {
        'GET /users': 'List users with pagination and filtering',
        'GET /users/:id': 'Get user by ID',
        'POST /users': 'Create new user',
        'DELETE /users/:id': 'Delete user by ID',
      },
    }),
  );

  // List users with pagination and filtering
  k.get('/users', {
    requestSchema: zodRequest({
      queries: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).default('1').describe('Page number'),
        pageSize: z.string().regex(/^\d+$/).transform(Number).default('10').describe('Items per page'),
        role: z.enum(['admin', 'user', 'guest']).optional().describe('Filter by role'),
      }),
    }),
    pluginMetadata: openApiRoute({
      summary: 'List all users',
      description: 'Retrieve a paginated list of all users in the system with optional role filtering',
      tags: ['Users'],
    }),
    handler: (ctx) => {
      const query = ctx.req.validated.queries;

      // Sample user data
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
        {
          id: 3,
          name: 'Charlie Brown',
          email: 'charlie@example.com',
          role: 'guest' as const,
          createdAt: '2024-01-03T00:00:00Z',
        },
      ];

      const filteredUsers = query.role ? users.filter((u) => u.role === query.role) : users;
      const startIndex = (query.page - 1) * query.pageSize;
      const endIndex = startIndex + query.pageSize;
      const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

      return ctx.res.json({
        users: paginatedUsers,
        pagination: {
          total: filteredUsers.length,
          page: query.page,
          pageSize: query.pageSize,
          totalPages: Math.ceil(filteredUsers.length / query.pageSize),
        },
        filter: query.role ? { role: query.role } : null,
      });
    },
  });

  // Get user by ID
  k.get('/users/:id', {
    requestSchema: zodRequest({
      params: z.object({
        id: z.string().regex(/^\d+$/).describe('User ID'),
      }),
    }),
    pluginMetadata: openApiRoute({
      summary: 'Get user by ID',
      description: 'Retrieve a specific user by their unique identifier',
      tags: ['Users'],
    }),
    handler: (ctx) => {
      const { id } = ctx.req.validated.params;
      const userId = parseInt(id);

      // Sample user lookup
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

      const user = users.find((u) => u.id === userId);

      if (!user) {
        return ctx.res.notFound({
          message: `User with ID ${id} not found`,
        });
      }

      return ctx.res.json(user);
    },
  });

  // Create a new user
  k.post('/users', {
    requestSchema: zodRequest({
      body: CreateUserSchema,
    }),
    pluginMetadata: openApiRoute({
      summary: 'Create a new user',
      description: 'Create a new user in the system with validation',
      tags: ['Users'],
    }),
    handler: (ctx) => {
      const body = ctx.req.validated.body;

      // Simulate user creation
      const newUser = {
        id: Math.floor(Math.random() * 1000) + 100, // Random ID for demo
        ...body,
        createdAt: new Date().toISOString(),
      };

      ctx.req.log.info('User created', { user: newUser });

      return ctx.res.status(201).json({
        message: 'User created successfully',
        user: newUser,
      });
    },
  });

  // Update user (partial update)
  k.patch('/users/:id', {
    requestSchema: zodRequest({
      params: z.object({
        id: z.string().regex(/^\d+$/).describe('User ID'),
      }),
      body: CreateUserSchema.partial(),
    }),
    pluginMetadata: openApiRoute({
      summary: 'Update user by ID',
      description: 'Partially update a user by their ID',
      tags: ['Users'],
    }),
    handler: (ctx) => {
      const { id } = ctx.req.validated.params;
      const updates = ctx.req.validated.body;

      ctx.req.log.info('User update requested', { userId: id, updates });

      // Simulate user update
      const updatedUser = {
        id: parseInt(id),
        name: updates.name ?? 'Original Name',
        email: updates.email ?? 'original@example.com',
        role: updates.role ?? 'user',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: new Date().toISOString(),
      };

      return ctx.res.json({
        message: 'User updated successfully',
        user: updatedUser,
      });
    },
  });

  // Delete user by ID
  k.delete('/users/:id', {
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

      ctx.req.log.info('User deletion requested', { userId: id });

      if (id === '999') {
        return ctx.res.notFound({
          message: `User with ID ${id} not found`,
        });
      }

      return ctx.res.status(204).empty();
    },
  });

  // Bulk operations example
  k.post('/users/bulk', {
    requestSchema: zodRequest({
      body: z.object({
        users: z.array(CreateUserSchema).min(1).max(10).describe('Array of users to create (max 10)'),
      }),
    }),
    pluginMetadata: openApiRoute({
      summary: 'Bulk create users',
      description: 'Create multiple users in a single request',
      tags: ['Users', 'Bulk Operations'],
    }),
    handler: (ctx) => {
      const { users } = ctx.req.validated.body;

      const createdUsers = users.map((user, index) => ({
        id: Math.floor(Math.random() * 1000) + 200 + index,
        ...user,
        createdAt: new Date().toISOString(),
      }));

      ctx.req.log.info('Bulk user creation', { count: users.length });

      return ctx.res.status(201).json({
        message: `${users.length} users created successfully`,
        users: createdUsers,
        summary: {
          requested: users.length,
          created: createdUsers.length,
          failed: 0,
        },
      });
    },
  });

  // Search users with complex query
  k.get('/users/search', {
    requestSchema: zodRequest({
      queries: z.object({
        q: z.string().min(1).describe('Search query'),
        fields: z.string().optional().describe('Comma-separated fields to search (name,email)'),
        sort: z.enum(['name', 'email', 'createdAt']).optional().describe('Sort field'),
        order: z.enum(['asc', 'desc']).default('asc').describe('Sort order'),
      }),
    }),
    pluginMetadata: openApiRoute({
      summary: 'Search users',
      description: 'Search users by name or email with sorting options',
      tags: ['Users', 'Search'],
    }),
    handler: (ctx) => {
      const query = ctx.req.validated.queries;

      ctx.req.log.info('User search requested', { query });

      // Simulate search results
      const searchResults = [
        {
          id: 1,
          name: 'Alice Johnson',
          email: 'alice@example.com',
          role: 'admin' as const,
          createdAt: '2024-01-01T00:00:00Z',
          score: 0.95,
        },
      ].filter(
        (user) =>
          user.name.toLowerCase().includes(query.q.toLowerCase()) ||
          user.email.toLowerCase().includes(query.q.toLowerCase()),
      );

      return ctx.res.json({
        query: query.q,
        results: searchResults,
        count: searchResults.length,
        searchOptions: {
          fields: query.fields?.split(',') ?? ['name', 'email'],
          sort: query.sort ?? 'name',
          order: query.order,
        },
      });
    },
  });

  // Initialization hook
  k.onInit(() => {
    k.log.info('OpenAPI example initialized!');
    k.log.info('Available endpoints:');
    k.log.info('   GET  /              - Welcome message');
    k.log.info('   GET  /users         - List users (paginated, filterable)');
    k.log.info('   GET  /users/:id     - Get user by ID');
    k.log.info('   POST /users         - Create new user');
    k.log.info('   PATCH /users/:id    - Update user by ID');
    k.log.info('   DELETE /users/:id   - Delete user by ID');
    k.log.info('   POST /users/bulk    - Bulk create users');
    k.log.info('   GET  /users/search  - Search users');
    k.log.info('');
    k.log.info('All endpoints include OpenAPI metadata for documentation');
    k.log.info('Zod validation is applied to all request schemas');
    k.log.info('OpenAPI example ready!');
  });

  return k;
}

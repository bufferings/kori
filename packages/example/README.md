# Kori Examples

Usage examples for the Kori web framework.

## Overview

This package contains two example applications that demonstrate Kori's features:

1. **Getting Started** - A beginner-friendly guide covering basic concepts
2. **Advanced Usage** - Comprehensive examples of advanced features

## Getting Started Example

**File**: `src/getting-started.ts`

A starter guide that covers the essential features of Kori:

- Simple route definitions with path parameters
- Query parameter handling and validation
- Request body validation with Zod
- User management API (CRUD operations)
- Cookie handling (set, read, delete)
- OpenAPI documentation with Swagger UI

### Run

```bash
pnpm dev:getting-started
```

Then open http://localhost:3000 in your browser to see the interactive API documentation.

### Example Endpoints

- `GET /hello/:name` - Simple greeting
- `GET /search?q=...&limit=10` - Query parameters
- `POST /users` - Create user with validation
- `GET /users/:id` - Get user by ID
- `GET /users` - List all users
- `POST /auth/login` - Login with cookies
- `GET /auth/profile` - Get profile (requires login)
- `POST /auth/logout` - Logout

## Advanced Usage Example

**File**: `src/advanced-usage.ts`

A comprehensive guide demonstrating advanced Kori features:

- **Custom plugins** - Request ID and timing plugins
- **Hooks and lifecycle** - onRequest, onError, defer
- **Complex validation** - Nested objects, headers, queries
- **Authentication** - Route-level auth with error handling
- **Multi-media types** - JSON, Form, XML content negotiation
- **Streaming** - SSE, file uploads, file downloads
- **Performance** - Lazy logging with factory functions
- **Advanced cookies** - Secure settings, multiple cookies

### Run

```bash
pnpm dev:advanced-usage
```

Then open http://localhost:3001 in your browser to see the interactive API documentation.

### Example Endpoints

#### Complex Validation
- `POST /products` - Complex nested validation
- `GET /products/search` - Advanced query parameters

#### Authentication
- `GET /admin/dashboard` - Protected admin route
- `POST /admin/maintenance` - Admin operations

#### Multi-Media Types
- `POST /users/simple` - Single media type
- `POST /users/multi` - Multiple media types
- `GET /users/:id/detailed` - Multi-format response

#### Streaming
- `GET /stream/events` - Server-Sent Events (SSE)
- `POST /stream/upload` - Stream file upload
- `GET /stream/download` - Stream download

#### Cookies
- `POST /cookies/preferences` - Set multiple cookies
- `POST /cookies/secure-session` - Secure cookie example
- `GET /cookies/visit` - Conditional cookies

#### Performance
- `GET /performance/lazy-logging` - Lazy logging demo

## Development

### Type Check

```bash
pnpm typecheck
```

### Lint

```bash
pnpm lint
pnpm lint:fix
```

## Learn More

For more information about Kori, visit the [main documentation](../../README.md).

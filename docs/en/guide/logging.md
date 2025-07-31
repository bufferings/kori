# Logging

Learn how to use Kori's logging features including structured JSON output, automatic request/response serialization, and configuration options.

## Overview

Kori defines a logger interface and includes a simple implementation designed for learning and getting started quickly. It provides structured JSON logging, automatic request/response serialization, and seamless integration with your application context.

For actual application development, consider using logging adapters like Pino (for Node.js) for better performance and production features.

## Logger Types

Kori provides two types of loggers:

- Application Logger (`app.log()`): For application-level events like startup, initialization, and system-wide operations
- Request Logger (`ctx.req.log()`): For request-specific events, automatically associated with the current HTTP request context

```typescript
const app = createKori();

// Application logger - for system events
app.log().info('Application starting', { port: 3000 });

app.get('/users', (ctx) => {
  // Request logger - for request-specific events
  ctx.req.log().info('Processing user request');
  return ctx.res.json({ users: [] });
});
```

## Log Levels

Kori supports six log levels ordered by severity:

```typescript
app.get('/example', (ctx) => {
  const logger = ctx.req.log();

  logger.trace('Entering handler'); // Most verbose
  logger.debug('Processing data', { userId: '123' });
  logger.info('Request completed successfully');
  logger.warn('Rate limit approaching', { remaining: 5 });
  logger.error('Database connection failed', { err: error });
  logger.fatal('Critical system failure'); // Most severe

  return ctx.res.json({ result: 'ok' });
});
```

Configure the minimum log level:

```typescript
const app = createKori({
  loggerOptions: {
    level: 'info', // Only log info and above (warn, error, fatal)
  },
});
```

## Structured Logging

Kori automatically structures your logs as JSON with consistent fields and timestamps:

```typescript
app.get('/users/:id', (ctx) => {
  const logger = ctx.req.log();

  logger.info('Fetching user', { userId: ctx.req.pathParams().id });

  return ctx.res.json({ user: { id: '123', name: 'John' } });
});
```

Output (formatted for readability, actual output is a single line):

```json
{
  "level": "info",
  "time": 1704067200000,
  "name": "request",
  "message": "Fetching user",
  "userId": "123"
}
```

## Automatic Serialization

Kori automatically serializes request, response, and error objects when logged:

### Request Serialization

```typescript
app.post('/users', (ctx) => {
  const logger = ctx.req.log();

  // Log the entire request - automatically serialized
  logger.info('User creation request', { req: ctx.req });

  return ctx.res.created({ user: { id: '123' } });
});
```

Serialized output (formatted for readability):

```json
{
  "level": "info",
  "time": 1704067200000,
  "name": "request",
  "message": "User creation request",
  "req": {
    "url": "http://localhost:3000/users",
    "method": "POST",
    "pathParams": {},
    "queryParams": {},
    "headers": {
      "content-type": "application/json",
      "user-agent": "curl/7.68.0"
    }
  }
}
```

The request object is automatically transformed to include:

- `url`: Complete request URL
- `method`: HTTP method
- `pathParams`: Path parameters object
- `queryParams`: Query parameters object
- `headers`: Request headers object

### Response Serialization

```typescript
app.get('/status', (ctx) => {
  const logger = ctx.req.log();

  const response = ctx.res.json({ status: 'healthy' });

  // Log response details - automatically serialized
  logger.info('Status check completed', { res: response });

  return response;
});
```

Serialized output (formatted for readability):

```json
{
  "level": "info",
  "time": 1704067200000,
  "name": "request",
  "message": "Status check completed",
  "res": {
    "status": 200,
    "headers": {
      "content-type": "application/json"
    }
  }
}
```

The response object is automatically transformed to include:

- `status`: HTTP status code
- `headers`: Response headers object

### Error Serialization

```typescript
app.get('/risky', (ctx) => {
  const logger = ctx.req.log();

  try {
    throw new Error('Something went wrong');
  } catch (error) {
    // Error automatically serialized with stack trace
    logger.error('Operation failed', { err: error });
    return ctx.res.internalError({ message: 'Internal error' });
  }
});
```

Serialized output (formatted for readability):

```json
{
  "level": "error",
  "time": 1704067200000,
  "name": "request",
  "message": "Operation failed",
  "err": {
    "name": "Error",
    "message": "Something went wrong",
    "stack": "Error: Something went wrong\n    at /app/handler.js:5:11\n    at ..."
  }
}
```

The error object is automatically transformed to include:

- `name`: Error class name
- `message`: Error message
- `stack`: Complete stack trace

## Child Loggers

Create specialized loggers for different components with additional context:

```typescript
app.get('/order/:id', (ctx) => {
  const baseLogger = ctx.req.log();

  // Create child logger for payment processing
  const paymentLogger = baseLogger.child('payment', {
    orderId: ctx.req.pathParams().id,
    paymentMethod: 'credit-card',
  });

  // Create child logger for inventory
  const inventoryLogger = baseLogger.child('inventory');

  paymentLogger.info('Processing payment'); // Includes payment context
  inventoryLogger.info('Updating stock'); // Includes base context only

  return ctx.res.json({ success: true });
});
```

Output examples (formatted for readability):

Payment logger output:

```json
{
  "level": "info",
  "time": 1704067200000,
  "name": "payment",
  "message": "Processing payment",
  "orderId": "order-123",
  "paymentMethod": "credit-card"
}
```

Inventory logger output:

```json
{
  "level": "info",
  "time": 1704067200000,
  "name": "inventory",
  "message": "Updating stock"
}
```

Child loggers inherit parent configuration and automatically include their name and bindings in all entries.

## Logger Configuration

Configure logging behavior at application startup:

```typescript
const app = createKori({
  loggerOptions: {
    level: 'debug',
    bindings: {
      service: 'user-api',
      version: '1.2.0',
    },
  },
});
```

- `level`: Sets the minimum log level (logs below this level are ignored)
- `bindings`: Key-value pairs automatically added to all log entries

## Level Checking

Avoid expensive operations when logging is disabled:

```typescript
app.get('/debug', (ctx) => {
  const logger = ctx.req.log();

  // Check if debug level is enabled before expensive computation
  if (logger.isLevelEnabled('debug')) {
    const expensiveData = computeSystemMetrics(); // Only run if needed
    logger.debug('System metrics', { metrics: expensiveData });
  }

  return ctx.res.json({ status: 'ok' });
});
```

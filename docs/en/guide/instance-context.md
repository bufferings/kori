# Instance Context

The **Instance Context** manages your application's lifecycle - initialization, configuration, and shutdown. It's where you set up shared resources and configure your application environment.

## What is Instance Context?

The **KoriInstanceContext** handles application-wide concerns that happen once when your app starts up or shuts down:

```typescript
type KoriInstanceContext<Env extends KoriEnvironment> = {
  env: Env;
  withEnv<EnvExt>(envExt: EnvExt): KoriInstanceContext<Env & EnvExt>;
};
```

**Perfect for:**

- Setting up database connections
- Loading configuration
- Initializing shared services
- Application shutdown cleanup

## Context Extensions

Instance context supports environment extensions through the `onInit()` hook. Use `ctx.withEnv()` to add shared resources that will be available throughout your application's lifecycle.

## Application Initialization

Use `app.onInit()` to set up your application environment:

```typescript
const app = createKori()
  // Initialize database and shared services
  .onInit(async (ctx) => {
    app.log().info('Initializing application...');

    // Set up database connection
    const db = await connectDatabase({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
    });

    // Initialize Redis cache
    const cache = await connectRedis({
      url: process.env.REDIS_URL,
    });

    // Load configuration
    const config = {
      apiVersion: 'v1',
      rateLimit: 1000,
      environment: process.env.NODE_ENV,
    };

    // Return extended environment
    return ctx.withEnv({
      db,
      cache,
      config,
    });
  });
```

## Application Shutdown

Clean up resources when the application shuts down:

```typescript
const app = createKori()
  .onInit(async (ctx) => {
    // Setup database, cache, config (see details above)
  })
  .onClose(async (ctx) => {
    app.log().info('Shutting down application...');

    // Close database connections
    await ctx.env.db.close();

    // Close cache connections
    await ctx.env.cache.disconnect();

    app.log().info('Application shutdown complete');
  });
```

## Environment Type Safety

The environment is fully typed across your application:

```typescript
// After initialization, the environment is fully typed in handlers
app.get('/users', async (ctx) => {
  // TypeScript knows ctx.env.db exists and its type
  const users = await ctx.env.db.query('SELECT * FROM users');
  return ctx.res.json({ users });
});
```

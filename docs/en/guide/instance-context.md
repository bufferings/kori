# Instance Context

The Instance Context manages your application's lifecycle - initialization, configuration, and shutdown. It's where you set up shared resources and configure your application environment.

## What is Instance Context?

The KoriInstanceContext handles application-wide concerns that happen once when your app starts up or shuts down:

```typescript
type KoriInstanceContext<Env extends KoriEnvironment> = {
  env: Env;

  withEnv<EnvExt>(envExt: EnvExt): KoriInstanceContext<Env & EnvExt>;

  defer(
    callback: (ctx: KoriInstanceContext<Env>) => Promise<void> | void,
  ): void;

  log(): KoriLogger;
};
```

Use it for setting up database connections, loading configuration, and initializing shared services.

## Context Extensions

Instance context supports environment extensions through the `onStart()` hook. Use `ctx.withEnv()` to add shared resources that will be available throughout your application's lifecycle.

## Application Initialization

Use `app.onStart()` to set up your application environment, where Instance Context is passed:

```typescript
const app = createKori()
  // Initialize database and shared services
  .onStart(async (ctx) => {
    ctx.log().info('Initializing application...');

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

Clean up resources when the application shuts down using `defer`:

```typescript
const app = createKori().onStart(async (ctx) => {
  ctx.log().info('Initializing application...');

  // Setup database, cache, config
  const db = await connectDatabase();
  const cache = await connectRedis();
  const config = {
    /* ... */
  };

  // Schedule shutdown cleanup
  ctx.defer(async (ctx) => {
    ctx.log().info('Shutting down application...');

    // Close database connections
    await ctx.env.db.close();

    // Close cache connections
    await ctx.env.cache.disconnect();

    ctx.log().info('Application shutdown complete');
  });

  return ctx.withEnv({ db, cache, config });
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

# Instance Context API Reference

The `KoriInstanceContext` manages application-wide lifecycle events, shared resource initialization, and environment configuration that persists across all requests.

## Type Definition

```typescript
type KoriInstanceContext<Env extends KoriEnvironment> = {
  env: Env;
  withEnv<EnvExt>(envExt: EnvExt): KoriInstanceContext<Env & EnvExt>;
};
```

## Lifecycle Management

### Application Initialization

The `onInit()` hook receives an instance context for setting up shared application resources:

```typescript
import { createKori } from '@korix/kori';

const app = createKori().onInit(async (ctx) => {
  app.log().info('Starting application initialization');

  // Database connections
  const db = await connectDatabase({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    ssl: process.env.NODE_ENV === 'production',
  });

  // Redis cache
  const cache = await connectRedis({
    url: process.env.REDIS_URL,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  });

  // External service clients
  const emailService = new EmailService({
    apiKey: process.env.EMAIL_API_KEY,
    defaultFrom: process.env.DEFAULT_FROM_EMAIL,
  });

  const paymentService = new PaymentService({
    secretKey: process.env.PAYMENT_SECRET_KEY,
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET,
  });

  // Configuration
  const config = {
    apiVersion: 'v1',
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    },
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:3000',
      ],
      credentials: true,
    },
    features: {
      enableAdvancedLogging: process.env.NODE_ENV === 'production',
      enableMetrics: process.env.ENABLE_METRICS === 'true',
    },
  };

  // Health checks
  await verifyDatabaseConnection(db);
  await verifyCacheConnection(cache);

  app.log().info('Application initialization completed', {
    dbHost: db.config.host,
    cacheConnected: cache.status === 'ready',
    environment: process.env.NODE_ENV,
  });

  // Return extended environment
  return ctx.withEnv({
    db,
    cache,
    emailService,
    paymentService,
    config,
    startTime: new Date(),
  });
});
```

### Application Shutdown

The `onClose()` hook handles graceful cleanup of shared resources:

```typescript
app.onClose(async (ctx) => {
  app.log().info('Starting application shutdown');

  const errors: Error[] = [];

  // Close database connections
  try {
    await ctx.env.db.close();
    app.log().info('Database connection closed');
  } catch (error) {
    errors.push(error);
    app.log().error('Failed to close database connection', { error });
  }

  // Disconnect cache
  try {
    await ctx.env.cache.disconnect();
    app.log().info('Cache connection closed');
  } catch (error) {
    errors.push(error);
    app.log().error('Failed to close cache connection', { error });
  }

  // Clean up external services
  try {
    await ctx.env.emailService.close();
    await ctx.env.paymentService.close();
    app.log().info('External services closed');
  } catch (error) {
    errors.push(error);
    app.log().error('Failed to close external services', { error });
  }

  // Log shutdown summary
  const uptime = Date.now() - ctx.env.startTime.getTime();
  app.log().info('Application shutdown completed', {
    uptime: `${Math.round(uptime / 1000)}s`,
    errors: errors.length,
  });

  if (errors.length > 0) {
    throw new AggregateError(errors, 'Shutdown completed with errors');
  }
});
```

## Environment Extensions

### `ctx.withEnv(extension)`

Extend the application environment with shared resources that will be available to all handlers:

```typescript
// Simple environment extension
app.onInit(async (ctx) => {
  const appConfig = loadConfiguration();
  return ctx.withEnv({ config: appConfig });
});

// Complex environment with multiple services
app.onInit(async (ctx) => {
  // Initialize services in dependency order
  const db = await initializeDatabase();
  const cache = await initializeCache();
  const messageQueue = await initializeMessageQueue();

  // Services that depend on database
  const userService = new UserService(db);
  const authService = new AuthService(db, cache);

  // Services that depend on multiple resources
  const notificationService = new NotificationService({
    db,
    messageQueue,
    emailClient: new EmailClient(),
  });

  return ctx.withEnv({
    // Core infrastructure
    db,
    cache,
    messageQueue,

    // Business services
    userService,
    authService,
    notificationService,

    // Configuration
    config: {
      auth: {
        jwtSecret: process.env.JWT_SECRET,
        tokenExpiry: '24h',
      },
      features: parseFeatureFlags(),
    },
  });
});
```

## Advanced Patterns

### Conditional Environment Setup

Set up different environments based on runtime conditions:

```typescript
app.onInit(async (ctx) => {
  const environment = process.env.NODE_ENV || 'development';

  // Base configuration
  let config = {
    apiVersion: 'v1',
    environment,
  };

  // Environment-specific setup
  if (environment === 'production') {
    // Production: Real database, Redis, monitoring
    const db = await connectPostgreSQL({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20, // connection pool size
    });

    const cache = await connectRedis({
      cluster: process.env.REDIS_CLUSTER_URLS?.split(','),
      enableReadyCheck: true,
    });

    const metrics = new PrometheusMetrics({
      register: new Registry(),
      defaultLabels: { service: 'api', version: process.env.APP_VERSION },
    });

    const logger = createProductionLogger({
      level: 'info',
      format: 'json',
      transports: ['console', 'file'],
    });

    return ctx.withEnv({
      db,
      cache,
      metrics,
      logger,
      config: {
        ...config,
        security: {
          cors: { origin: process.env.ALLOWED_ORIGINS?.split(',') },
          rateLimit: { windowMs: 900000, max: 100 },
        },
      },
    });
  }

  if (environment === 'test') {
    // Test: In-memory database, mock services
    const db = await connectSQLite(':memory:');
    const cache = new InMemoryCache();
    const emailService = new MockEmailService();

    return ctx.withEnv({
      db,
      cache,
      emailService,
      config: {
        ...config,
        security: {
          cors: { origin: '*' },
          rateLimit: { windowMs: 1000, max: 1000 },
        },
      },
    });
  }

  // Development: Local services, debug logging
  const db = await connectSQLite('./dev.db');
  const cache = new InMemoryCache();
  const emailService = new DebugEmailService();

  return ctx.withEnv({
    db,
    cache,
    emailService,
    config: {
      ...config,
      security: {
        cors: { origin: ['http://localhost:3000', 'http://localhost:5173'] },
        rateLimit: { windowMs: 1000, max: 1000 },
      },
    },
  });
});
```

### Modular Service Initialization

Organize complex initialization into modular functions:

```typescript
// Service factory functions
async function createDatabaseServices(config: DatabaseConfig) {
  const db = await connectDatabase(config);

  return {
    db,
    userRepository: new UserRepository(db),
    postRepository: new PostRepository(db),
    migrationService: new MigrationService(db),
  };
}

async function createCacheServices(config: CacheConfig) {
  const redis = await connectRedis(config);

  return {
    redis,
    sessionStore: new RedisSessionStore(redis),
    cacheManager: new CacheManager(redis),
  };
}

async function createExternalServices(config: ExternalConfig) {
  return {
    emailService: new EmailService(config.email),
    paymentService: new PaymentService(config.payment),
    storageService: new S3StorageService(config.storage),
  };
}

// Compose in onInit
app.onInit(async (ctx) => {
  const config = loadConfiguration();

  // Initialize services in parallel where possible
  const [dbServices, cacheServices, externalServices] = await Promise.all([
    createDatabaseServices(config.database),
    createCacheServices(config.cache),
    createExternalServices(config.external),
  ]);

  // Services that depend on others
  const authService = new AuthService({
    userRepository: dbServices.userRepository,
    sessionStore: cacheServices.sessionStore,
  });

  const notificationService = new NotificationService({
    emailService: externalServices.emailService,
    userRepository: dbServices.userRepository,
  });

  return ctx.withEnv({
    // Core services
    ...dbServices,
    ...cacheServices,
    ...externalServices,

    // Composed services
    authService,
    notificationService,

    config,
  });
});
```

### Health Check Integration

Implement comprehensive health checks using the environment:

```typescript
app.onInit(async (ctx) => {
  // Initialize services
  const db = await connectDatabase();
  const cache = await connectRedis();
  const messageQueue = await connectMessageQueue();

  // Health check registry
  const healthChecks = new Map([
    ['database', () => db.ping()],
    ['cache', () => cache.ping()],
    ['message-queue', () => messageQueue.ping()],
    ['external-api', () => fetch(process.env.EXTERNAL_API_HEALTH_URL)],
  ]);

  return ctx.withEnv({
    db,
    cache,
    messageQueue,
    healthChecks,
    startTime: new Date(),
  });
});

// Health check endpoint using the environment
app.get('/health', async (ctx) => {
  const results = new Map();
  let allHealthy = true;

  // Run all health checks
  for (const [name, check] of ctx.env.healthChecks) {
    try {
      const startTime = Date.now();
      await check();
      results.set(name, {
        status: 'healthy',
        responseTime: Date.now() - startTime,
      });
    } catch (error) {
      allHealthy = false;
      results.set(name, {
        status: 'unhealthy',
        error: error.message,
      });
    }
  }

  // Application metadata
  const uptime = Date.now() - ctx.env.startTime.getTime();
  const status = allHealthy ? 'healthy' : 'unhealthy';

  return ctx.res.status(allHealthy ? 200 : 503).json({
    status,
    uptime: Math.round(uptime / 1000),
    timestamp: new Date().toISOString(),
    checks: Object.fromEntries(results),
  });
});
```

## Error Handling

### Initialization Error Handling

Handle errors during application initialization:

```typescript
app.onInit(async (ctx) => {
  try {
    // Critical services (app won't start without these)
    const db = await connectDatabase();

    // Test critical connections
    await db.ping();

    // Optional services (app can start without these)
    let cache;
    let emailService;

    try {
      cache = await connectRedis();
      app.log().info('Cache service connected');
    } catch (error) {
      app
        .log()
        .warn('Cache service unavailable, using in-memory fallback', { error });
      cache = new InMemoryCache();
    }

    try {
      emailService = new EmailService(process.env.EMAIL_API_KEY);
      await emailService.verify();
      app.log().info('Email service connected');
    } catch (error) {
      app
        .log()
        .warn('Email service unavailable, using mock service', { error });
      emailService = new MockEmailService();
    }

    return ctx.withEnv({
      db,
      cache,
      emailService,
      config: loadConfiguration(),
    });
  } catch (error) {
    app.log().fatal('Failed to initialize application', { error });
    throw error; // This will prevent the application from starting
  }
});
```

### Graceful Degradation

Implement fallback services for non-critical dependencies:

```typescript
async function createResilientServices() {
  const services = {
    cache: null as CacheService | null,
    emailService: null as EmailService | null,
    metricsService: null as MetricsService | null,
  };

  // Cache with fallback
  try {
    services.cache = await createRedisCache();
  } catch (error) {
    app.log().warn('Redis unavailable, using in-memory cache', { error });
    services.cache = new InMemoryCache();
  }

  // Email with fallback
  try {
    services.emailService = await createEmailService();
  } catch (error) {
    app
      .log()
      .warn('Email service unavailable, using console logger', { error });
    services.emailService = new ConsoleEmailService();
  }

  // Metrics with fallback
  try {
    services.metricsService = await createMetricsService();
  } catch (error) {
    app.log().warn('Metrics service unavailable, disabling metrics', { error });
    services.metricsService = new NoOpMetricsService();
  }

  return services;
}

app.onInit(async (ctx) => {
  const db = await connectDatabase(); // Critical - will throw if fails
  const services = await createResilientServices(); // Graceful fallbacks

  return ctx.withEnv({
    db,
    ...services,
    config: loadConfiguration(),
  });
});
```

## Testing Instance Context

### Mock Environment for Testing

```typescript
import { createKori } from '@korix/kori';

function createTestApp() {
  return createKori().onInit(async (ctx) => {
    // Test environment with mocks
    const mockDb = new MockDatabase();
    const mockCache = new MockCache();
    const mockEmailService = new MockEmailService();

    return ctx.withEnv({
      db: mockDb,
      cache: mockCache,
      emailService: mockEmailService,
      config: {
        environment: 'test',
        features: { enableTestMode: true },
      },
    });
  });
}

describe('Application Initialization', () => {
  it('should initialize test environment', async () => {
    const app = createTestApp();

    // Test that environment is properly configured
    app.get('/test', (ctx) => {
      expect(ctx.env.config.environment).toBe('test');
      expect(ctx.env.config.features.enableTestMode).toBe(true);
      return ctx.res.text('OK');
    });

    const response = await app.request('/test');
    expect(response.status).toBe(200);
  });
});
```

### Integration Testing

```typescript
describe('Database Integration', () => {
  let app: Kori;
  let testDb: Database;

  beforeAll(async () => {
    testDb = await createTestDatabase();

    app = createKori().onInit(async (ctx) => {
      return ctx.withEnv({
        db: testDb,
        config: { environment: 'test' },
      });
    });
  });

  afterAll(async () => {
    await testDb.close();
  });

  it('should have database available in handlers', async () => {
    app.get('/users', async (ctx) => {
      const users = await ctx.env.db.query('SELECT * FROM users');
      return ctx.res.json({ users });
    });

    const response = await app.request('/users');
    expect(response.status).toBe(200);
  });
});
```

## Best Practices

### 1. Initialize Dependencies in Order

Order initialization based on dependencies:

```typescript
app.onInit(async (ctx) => {
  // 1. Core infrastructure (no dependencies)
  const config = loadConfiguration();

  // 2. External connections
  const db = await connectDatabase(config.database);
  const cache = await connectRedis(config.cache);

  // 3. Services that depend on infrastructure
  const userService = new UserService(db);
  const authService = new AuthService(db, cache);

  // 4. Services that depend on other services
  const notificationService = new NotificationService({
    userService,
    emailClient: new EmailClient(config.email),
  });

  return ctx.withEnv({
    config,
    db,
    cache,
    userService,
    authService,
    notificationService,
  });
});
```

### 2. Use Typed Configuration

Strongly type your configuration:

```typescript
type AppConfig = {
  database: {
    host: string;
    port: number;
    name: string;
  };
  cache: {
    url: string;
    ttl: number;
  };
  features: {
    enableAdvancedAuth: boolean;
    maxUploadSize: number;
  };
};

function loadTypedConfiguration(): AppConfig {
  return {
    database: {
      host: process.env.DB_HOST!,
      port: parseInt(process.env.DB_PORT || '5432'),
      name: process.env.DB_NAME!,
    },
    cache: {
      url: process.env.REDIS_URL!,
      ttl: parseInt(process.env.CACHE_TTL || '3600'),
    },
    features: {
      enableAdvancedAuth: process.env.ADVANCED_AUTH === 'true',
      maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE || '10485760'),
    },
  };
}

app.onInit(async (ctx) => {
  const config = loadTypedConfiguration();
  const db = await connectDatabase(config.database);

  return ctx.withEnv({ config, db });
});
```

### 3. Implement Proper Cleanup

Always implement proper resource cleanup:

```typescript
app.onClose(async (ctx) => {
  const cleanup = new PromiseSettledResultsHandler();

  // Close all resources, collecting errors
  cleanup.add('database', ctx.env.db.close());
  cleanup.add('cache', ctx.env.cache.disconnect());
  cleanup.add('queue', ctx.env.messageQueue.close());

  const results = await cleanup.settle();

  // Log all results
  for (const [name, result] of results) {
    if (result.status === 'fulfilled') {
      app.log().info(`${name} closed successfully`);
    } else {
      app.log().error(`Failed to close ${name}`, { error: result.reason });
    }
  }

  // Throw if any critical cleanup failed
  const failures = results.filter(
    ([_, result]) => result.status === 'rejected',
  );
  if (failures.length > 0) {
    throw new Error(
      `Cleanup failed for: ${failures.map(([name]) => name).join(', ')}`,
    );
  }
});
```

## Next Steps

- [Handler Context API Reference](/en/core/handler-context) - Request-scoped context management
- [Request API Reference](/en/core/request) - Complete request object documentation
- [Response API Reference](/en/core/response) - Complete response object documentation
- [Instance Context Guide](/en/guide/instance-context) - Practical usage patterns

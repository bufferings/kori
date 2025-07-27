# Configuration

Learn how to configure your Kori application for different environments and use cases.

## Basic Configuration

Kori applications can be configured when creating the instance:

```typescript
import { createKori } from '@korix/kori';

const app = createKori({
  // Configuration options go here
});
```

## Environment Variables

Kori supports environment-based configuration:

```typescript
const app = createKori({
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  host: process.env.HOST || 'localhost',
});
```

## Logging Configuration

Configure logging for your application:

```typescript
import { createKori } from '@korix/kori';
import { pinoLoggerFactory } from '@korix/pino-adapter';

const app = createKori({
  logger: pinoLoggerFactory({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    prettyPrint: process.env.NODE_ENV !== 'production',
  }),
});
```

## CORS Configuration

Set up Cross-Origin Resource Sharing:

```typescript
import { corsPlugin } from '@korix/cors-plugin';

app.applyPlugin(
  corsPlugin({
    origin: process.env.NODE_ENV === 'production' ? ['https://myapp.com'] : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['content-type', 'authorization'],
  }),
);
```

## Security Headers

Configure security headers for production:

```typescript
import { securityHeadersPlugin } from '@korix/security-headers-plugin';

app.applyPlugin(
  securityHeadersPlugin({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);
```

## Body Parsing Configuration

Configure request body parsing limits:

```typescript
import { bodyLimitPlugin } from '@korix/body-limit-plugin';

app.applyPlugin(
  bodyLimitPlugin({
    maxSize: process.env.NODE_ENV === 'production' ? '1mb' : '10mb',
    types: ['application/json', 'application/x-www-form-urlencoded'],
  }),
);
```

## File Serving Configuration

Set up static file serving:

```typescript
import { serveStaticPlugin } from '@korix/file-plugin-nodejs';

app.applyPlugin(
  serveStaticPlugin({
    root: './public',
    prefix: '/static',
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
    gzip: true,
    brotli: true,
  }),
);
```

## Development vs Production

Create environment-specific configurations:

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

let app = createKori({
  logger: isDevelopment ? { level: 'debug', prettyPrint: true } : { level: 'info' },
});

if (isDevelopment) {
  // Development-only plugins
  app = app.applyPlugin(corsPlugin({ origin: true }));
}

if (isProduction) {
  // Production-only plugins
  app = app.applyPlugin(securityHeadersPlugin()).applyPlugin(bodyLimitPlugin({ maxSize: '1mb' }));
}
```

## Configuration Files

For complex applications, use configuration files:

**config/default.json**

```json
{
  "server": {
    "port": 3000,
    "host": "localhost"
  },
  "cors": {
    "origin": true,
    "credentials": true
  },
  "security": {
    "bodyLimit": "10mb"
  }
}
```

**config/production.json**

```json
{
  "server": {
    "port": 8080,
    "host": "0.0.0.0"
  },
  "cors": {
    "origin": ["https://myapp.com"],
    "credentials": true
  },
  "security": {
    "bodyLimit": "1mb"
  }
}
```

**server.ts**

```typescript
import config from 'config';
import { createKori } from '@korix/kori';

const app = createKori()
  .applyPlugin(corsPlugin(config.get('cors')))
  .applyPlugin(
    bodyLimitPlugin({
      maxSize: config.get('security.bodyLimit'),
    }),
  );

const serverConfig = config.get('server');
serve(app, serverConfig);
```

## Runtime-Specific Configuration

### Node.js

```typescript
import { serve } from '@korix/nodejs-adapter';

serve(app, {
  port: 3000,
  hostname: '0.0.0.0',
  // Node.js specific options
});
```

### Bun

```typescript
export default {
  port: 3000,
  hostname: '0.0.0.0',
  fetch: app.fetch,
  // Bun specific options
};
```

### Deno

```typescript
import { serve } from 'https://deno.land/std/http/server.ts';

serve(app.fetch, {
  port: 3000,
  hostname: '0.0.0.0',
  // Deno specific options
});
```

## Best Practices

### 1. Use Environment Variables

```typescript
const config = {
  port: Number(process.env.PORT) || 3000,
  dbUrl: process.env.DATABASE_URL || 'sqlite://./dev.db',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
};
```

### 2. Validate Configuration

```typescript
import { z } from 'zod/v4';

const ConfigSchema = z.object({
  port: z.number().min(1).max(65535),
  dbUrl: z.string().url(),
  jwtSecret: z.string().min(32),
});

const config = ConfigSchema.parse({
  port: Number(process.env.PORT) || 3000,
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
});
```

### 3. Separate Concerns

```typescript
// config/database.ts
export const databaseConfig = {
  url: process.env.DATABASE_URL,
  maxConnections: Number(process.env.DB_MAX_CONNECTIONS) || 10,
};

// config/auth.ts
export const authConfig = {
  jwtSecret: process.env.JWT_SECRET,
  tokenExpiry: process.env.TOKEN_EXPIRY || '1h',
};

// server.ts
import { databaseConfig, authConfig } from './config';
```

### 4. Use Type-Safe Configuration

```typescript
interface AppConfig {
  server: {
    port: number;
    host: string;
  };
  database: {
    url: string;
    maxConnections: number;
  };
  auth: {
    jwtSecret: string;
    tokenExpiry: string;
  };
}

const config: AppConfig = {
  server: {
    port: Number(process.env.PORT) || 3000,
    host: process.env.HOST || 'localhost',
  },
  database: {
    url: process.env.DATABASE_URL!,
    maxConnections: Number(process.env.DB_MAX_CONNECTIONS) || 10,
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET!,
    tokenExpiry: process.env.TOKEN_EXPIRY || '1h',
  },
};
```

## Next Steps

- [Learn about validation setup](/en/guide/validation) - Configure request/response validation
- [Explore the plugin system](/en/guide/plugins) - Extend your application with plugins
- [Set up error handling](/en/guide/error-handling) - Handle errors gracefully
- [Examples](/en/examples/) - See configuration in real applications

```

```

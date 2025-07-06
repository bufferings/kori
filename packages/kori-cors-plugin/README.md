# kori-cors-plugin

CORS (Cross-Origin Resource Sharing) plugin for the Kori framework.

## Installation

```bash
npm install kori-cors-plugin
```

## Usage

### Basic Usage

```typescript
import { createKori } from 'kori';
import { corsPlugin } from 'kori-cors-plugin';

const app = createKori()
  .applyPlugin(corsPlugin())
  .get('/api/data', (ctx) => {
    return ctx.res.json({ message: 'Hello from CORS-enabled API!' });
  });
```

### Configuration Options

#### Specific Origin

```typescript
const app = createKori()
  .applyPlugin(corsPlugin({
    origin: 'https://example.com',
    credentials: true,
  }))
  .get('/api/secure', (ctx) => {
    return ctx.res.json({ data: 'Secure data' });
  });
```

#### Multiple Origins

```typescript
const app = createKori()
  .applyPlugin(corsPlugin({
    origin: ['https://app1.com', 'https://app2.com'],
    methods: ['GET', 'POST', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 3600, // 1 hour
  }))
  .get('/api/multi-origin', (ctx) => {
    return ctx.res.json({ message: 'Multi-origin enabled' });
  });
```

#### Dynamic Origin Validation

```typescript
const app = createKori()
  .applyPlugin(corsPlugin({
    origin: (origin, req) => {
      // Allow requests from subdomains of example.com
      if (!origin) return false;
      return origin.endsWith('.example.com') || origin === 'https://example.com';
    },
    credentials: true,
  }))
  .get('/api/dynamic', (ctx) => {
    return ctx.res.json({ message: 'Dynamic origin validation' });
  });
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `origin` | `string \| string[] \| boolean \| function` | `true` | Configures the Access-Control-Allow-Origin header |
| `methods` | `string[]` | `['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE']` | Configures the Access-Control-Allow-Methods header |
| `allowedHeaders` | `string[] \| boolean` | `undefined` | Configures the Access-Control-Allow-Headers header |
| `exposedHeaders` | `string[]` | `undefined` | Configures the Access-Control-Expose-Headers header |
| `credentials` | `boolean` | `false` | Configures the Access-Control-Allow-Credentials header |
| `maxAge` | `number` | `86400` | Configures the Access-Control-Max-Age header (in seconds) |
| `preflightContinue` | `boolean` | `false` | Pass control to next handler for preflight requests |
| `optionsSuccessStatus` | `number` | `204` | Status code for successful preflight requests |

### Origin Configuration

- **`true`**: Allow all origins (`*`)
- **`false`**: Disable CORS
- **`string`**: Allow specific origin
- **`string[]`**: Allow multiple specific origins
- **`function`**: Dynamic origin validation function

### Headers Configuration

- **`allowedHeaders: true`**: Reflect the request's Access-Control-Request-Headers
- **`allowedHeaders: string[]`**: Allow specific headers
- **`allowedHeaders: false`**: Don't set the header

## Features

- **Automatic preflight handling**: Handles OPTIONS requests automatically
- **Flexible origin configuration**: Support for static, multiple, and dynamic origins
- **Header management**: Configurable allowed and exposed headers
- **Credentials support**: Enable/disable credentials
- **Caching**: Configurable max-age for preflight responses
- **Vary header handling**: Automatically sets Vary headers when needed
- **Comprehensive logging**: Debug and info logging for troubleshooting

## Examples

### Allow All Origins (Development)

```typescript
const app = createKori()
  .applyPlugin(corsPlugin({
    origin: true,
    credentials: false,
  }));
```

### Production Configuration

```typescript
const app = createKori()
  .applyPlugin(corsPlugin({
    origin: ['https://myapp.com', 'https://admin.myapp.com'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400, // 24 hours
  }));
```

### Custom Preflight Handling

```typescript
const app = createKori()
  .applyPlugin(corsPlugin({
    origin: true,
    preflightContinue: true,
    optionsSuccessStatus: 200,
  }))
  .options('/api/custom-preflight', (ctx) => {
    // Custom preflight logic
    return ctx.res.json({ message: 'Custom preflight response' });
  });
```

## License

MIT
# @korix/nodejs-adapter

Adapter for running Kori applications on Node.js.

Wraps [`@hono/node-server`](https://github.com/honojs/node-server) for Kori applications.

## Installation

```bash
npm install @korix/nodejs-adapter @korix/kori
```

## Usage

```typescript
import { createKori } from '@korix/kori';
import { startNodeServer } from '@korix/nodejs-adapter';

const app = createKori();

app.get('/', (ctx) => {
  return ctx.res.text('Hello, Kori!');
});

await startNodeServer(app, {
  hostname: 'localhost',
  port: 3000,
});
```

## API

### `startNodeServer(kori, options?)`

Starts a Node.js HTTP server for a Kori application.

#### Parameters

- `kori` - Kori application instance
- `options` - Server options (optional)
  - `hostname` - Hostname to bind to (default: `'localhost'`)
  - `port` - Port number to listen on (default: `3000`)

#### Features

- Graceful shutdown handling (SIGINT/SIGTERM)
- Automatic logging of server startup and shutdown events
- Error handling and process exit on fatal errors

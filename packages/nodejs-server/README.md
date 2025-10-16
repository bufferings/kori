# @korix/nodejs-server

Node.js server for Kori framework.

Wraps [`@hono/node-server`](https://github.com/honojs/node-server) for Kori applications.

## Installation

```bash
npm install @korix/nodejs-server @korix/kori
```

## Usage

```typescript
import { createKori } from '@korix/kori';
import { startNodejsServer } from '@korix/nodejs-server';

const app = createKori();

app.get('/', (ctx) => {
  return ctx.res.text('Hello, Kori!');
});

await startNodejsServer(app, {
  hostname: 'localhost',
  port: 3000,
});
```

## API

### `startNodejsServer(kori, options?)`

Starts a Node.js HTTP server for a Kori application.

#### Parameters

- `kori` - Kori application instance
- `options` - Server options (optional)
  - `hostname` - Hostname to bind to (default: `'localhost'`)
  - `port` - Port number to listen on (default: `3000`)

#### Features

- Graceful shutdown handling (SIGINT/SIGTERM)
- Automatic logging of server startup and shutdown events

## License

MIT

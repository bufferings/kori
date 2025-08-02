/* eslint-disable @typescript-eslint/no-misused-promises */

import { createAdaptorServer, type ServerType } from '@hono/node-server';
import {
  type Kori,
  type KoriEnvironment,
  type KoriRequest,
  type KoriRequestValidatorDefault,
  type KoriResponse,
  type KoriResponseValidatorDefault,
} from '@korix/kori';

const LOGGER_CHANNEL = 'nodejs-adapter';

function setupGracefulShutdown<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  ResponseValidator extends KoriResponseValidatorDefault | undefined,
>(server: ServerType, kori: Kori<Env, Req, Res, RequestValidator, ResponseValidator>, onClose: () => Promise<void>) {
  const handler = async () => {
    const log = kori.log().channel(LOGGER_CHANNEL);
    log.info('Shutting down server...');
    await onClose();
    server.close((err) => {
      if (err) {
        log.error('Error closing server', { err });
        process.exit(1);
      }
      process.exit(0);
    });
  };

  process.once('SIGINT', handler);
  process.once('SIGTERM', handler);
}

/**
 * Run Kori application as a Node.js HTTP server
 */
export async function startNodeServer<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  ResponseValidator extends KoriResponseValidatorDefault | undefined,
>(
  kori: Kori<Env, Req, Res, RequestValidator, ResponseValidator>,
  options: {
    hostname?: string;
    port?: number;
    enableGracefulShutdown?: boolean;
  } = {},
): Promise<void> {
  const port = options.port ?? 3000;
  const hostname = options.hostname ?? 'localhost';

  const generated = kori.generate();
  const { fetchHandler, onClose } = await generated.onStart();

  const server = createAdaptorServer({
    fetch: fetchHandler,
    port,
    hostname,
  });

  server.listen(port, hostname, () => {
    const log = kori.log().channel(LOGGER_CHANNEL);

    const address = server.address();
    if (address && typeof address !== 'string') {
      const actualHost = address.address;
      const actualPort = address.port;
      const displayHost = address.family === 'IPv6' ? `[${actualHost}]` : actualHost;

      log.info(`Kori server started at http://${displayHost}:${actualPort}`);
    } else if (address && typeof address === 'string') {
      // For IPC (unix domain socket), just show the path
      log.info(`Kori server started at ${address}`);
    } else {
      // Fallback, though it should not be reachable for a TCP server
      log.info(`Kori server listening... (could not determine address)`);
    }
  });

  if (options.enableGracefulShutdown ?? true) {
    setupGracefulShutdown(server, kori, onClose);
  }
}

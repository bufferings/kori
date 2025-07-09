/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */

import { createAdaptorServer, type ServerType } from '@hono/node-server';
import {
  type Kori,
  type KoriEnvironment,
  type KoriRequest,
  type KoriRequestValidatorDefault,
  type KoriResponse,
  type KoriResponseValidatorDefault,
} from '@korix/kori';

function setupGracefulShutdown<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  ResponseValidator extends KoriResponseValidatorDefault | undefined,
>(server: ServerType, kori: Kori<Env, Req, Res, RequestValidator, ResponseValidator>, onClose: () => Promise<void>) {
  const handler = async () => {
    kori.log.info('Shutting down server...');
    await onClose();
    server.close((err) => {
      if (err) {
        kori.log.error('Error closing server', { err });
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
  const port = options.port || 3000;
  const hostname = options.hostname || 'localhost';

  const generated = kori.generate();
  const { fetchHandler, onClose } = await generated.onInit();

  const server = createAdaptorServer({
    fetch: fetchHandler,
    port,
    hostname,
  });
  server.listen(port, hostname, () => {
    kori.log.info(`Kori server started at http://${hostname}:${port}`);
  });

  if (options.enableGracefulShutdown ?? true) {
    setupGracefulShutdown(server, kori, onClose);
  }
}

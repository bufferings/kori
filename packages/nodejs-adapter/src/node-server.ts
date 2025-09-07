import { createAdaptorServer } from '@hono/node-server';
import {
  type Kori,
  type KoriEnvironment,
  type KoriRequest,
  type KoriRequestValidatorDefault,
  type KoriResponse,
  type KoriResponseValidatorDefault,
  createKoriSystemLogger,
} from '@korix/kori';

/**
 * Starts a Node.js HTTP server for a Kori application.
 *
 * Registers signal handlers for graceful shutdown (SIGINT, SIGTERM), logs
 * startup information, and exits the process on shutdown completion or on
 * fatal startup errors.
 *
 * @template Env - Environment type merged across plugins and children
 * @template Req - Request type merged across plugins and routes
 * @template Res - Response type merged across plugins and routes
 * @template RequestValidator - Request validator type or undefined
 * @template ResponseValidator - Response validator type or undefined
 * @param kori - Kori application instance to serve
 * @param options - Server options
 * @param options.hostname - Hostname for listen and URL reconstruction fallback (default 'localhost')
 * @param options.port - Port number for listen (default 3000)
 * @returns Promise that resolves once the server has begun listening
 *
 * @remarks
 * - Adds process-level signal handlers (once) for graceful shutdown.
 * - Logs to the system channel via createKoriSystemLogger.
 * - On unrecoverable startup issues, closes the server and exits with code 1.
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
  } = {},
): Promise<void> {
  const port = options.port ?? 3000;
  const hostname = options.hostname ?? 'localhost';
  const log = createKoriSystemLogger({ baseLogger: kori.log() });

  const generated = kori.generate();
  const { fetchHandler, onClose } = await generated.onStart();

  const server = createAdaptorServer({
    fetch: fetchHandler,
    hostname,
  });

  server.on('error', (err) => {
    log.error('Server error', { err });
  });

  server.listen(port, hostname, () => {
    const address = server.address();
    if (!address || typeof address === 'string') {
      log.error('Failed to determine server address after listen');
      try {
        server.close(() => {
          process.exit(1);
        });
      } catch {
        process.exit(1);
      }
      return;
    }

    let displayHost = hostname;
    if (hostname === '0.0.0.0' || hostname === '::' || hostname === '::1') {
      displayHost = 'localhost';
    }

    const actualPort = address.port;
    log.info(`Kori server started at http://${displayHost}:${actualPort}`);
  });

  const gracefulShutdownHandler = async () => {
    log.info('Shutting down server...');
    try {
      await onClose();
    } catch (err) {
      log.error('Error closing server', { err });
    }
    server.close((err) => {
      if (err) {
        log.error('Error closing server', { err });
        process.exit(1);
      }
      process.exit(0);
    });
  };

  process.once('SIGINT', () => {
    void gracefulShutdownHandler();
  });
  process.once('SIGTERM', () => {
    void gracefulShutdownHandler();
  });
}

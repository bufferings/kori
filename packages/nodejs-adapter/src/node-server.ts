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
 * startup information, and exits the process on shutdown completion.
 * On startup failure, rejects the Promise - caller must handle exit.
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
 * @returns Promise that resolves once the server has begun listening, rejects on startup failure
 *
 * @remarks
 * - Adds process-level signal handlers (once) for graceful shutdown.
 * - Logs to the system channel via createKoriSystemLogger.
 * - On startup failure, rejects Promise with error details for caller handling.
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
  });

  return new Promise((resolve, reject) => {
    const startupErrorHandler = (err: unknown) => {
      log.error('Server startup error', { err });
      reject(err instanceof Error ? err : new Error(String(err)));
    };

    server.on('error', startupErrorHandler);

    server.listen(port, hostname, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        log.error('Failed to determine server address after listen');
        try {
          server.close(() => {
            reject(new Error('Failed to determine server address'));
          });
        } catch (closeErr) {
          reject(closeErr instanceof Error ? closeErr : new Error(String(closeErr)));
        }
        return;
      }

      let displayHost = hostname;
      if (hostname === '0.0.0.0' || hostname === '::' || hostname === '::1') {
        displayHost = 'localhost';
      }

      const actualPort = address.port;
      log.info(`Kori server started at http://${displayHost}:${actualPort}`);

      // Switch to runtime error handler after successful startup
      server.removeListener('error', startupErrorHandler);
      server.on('error', (err) => {
        log.error('Server runtime error', { err });
        // Runtime errors are logged but don't terminate the server
      });

      // Set up graceful shutdown handlers after server successfully starts
      const gracefulShutdownHandler = async () => {
        log.info('Shutting down server...');
        let onCloseError: Error | undefined;

        try {
          await onClose();
        } catch (err) {
          onCloseError = err instanceof Error ? err : new Error(String(err));
          log.error('Error during graceful shutdown', { err: onCloseError });
        }

        server.close((serverCloseError) => {
          if (serverCloseError) {
            log.error('Error closing HTTP server', { err: serverCloseError });
          }

          // Exit with error code if either onClose() or server.close() failed
          const exitCode = onCloseError || serverCloseError ? 1 : 0;
          process.exit(exitCode);
        });
      };

      process.once('SIGINT', () => {
        void gracefulShutdownHandler();
      });
      process.once('SIGTERM', () => {
        void gracefulShutdownHandler();
      });

      resolve();
    });
  });
}

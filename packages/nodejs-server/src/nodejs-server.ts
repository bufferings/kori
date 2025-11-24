import { createAdaptorServer } from '@hono/node-server';
import { type ServerType } from '@hono/node-server';
import {
  type Kori,
  type KoriEnvironment,
  type KoriRequest,
  type KoriResponse,
  createKoriSystemLogger,
  type KoriLogger,
  type KoriValidatorBase,
} from '@korix/kori';

function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}

function startListening(options: {
  hostname: string;
  port: number;
  server: ServerType;
  onClose: () => Promise<void>;
  log: KoriLogger;
}): Promise<void> {
  const { hostname, port, server, onClose, log } = options;

  return new Promise<void>((resolve, reject) => {
    let settled = false;

    const onListening = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      server.removeListener('error', onError);
      resolve();
    };

    const onError = (err: unknown): void => {
      if (settled) {
        return;
      }
      settled = true;
      server.removeListener('listening', onListening);

      void (async () => {
        try {
          await onClose();
        } catch (cleanupErr) {
          log.error('Error during startup cleanup', { err: cleanupErr });
        } finally {
          server.close((closeErr: unknown) => {
            if (closeErr) {
              log.error('Error closing server during startup cleanup', { err: closeErr });
            }
            reject(toError(err));
          });
        }
      })();
    };

    server.once('listening', onListening);
    server.once('error', onError);
    server.listen(port, hostname);
  });
}

async function verifyAddress(options: {
  server: ServerType;
  onClose: () => Promise<void>;
  log: KoriLogger;
}): Promise<{ port: number }> {
  const { server, onClose, log } = options;

  const address = server.address();
  if (!address || typeof address === 'string') {
    log.error('Failed to determine server address after listen');
    try {
      await onClose();
    } catch (cleanupErr) {
      log.error('Error during startup cleanup', { err: cleanupErr });
    }
    const closeErr: Error | undefined = await new Promise((resolve) => {
      server.close((err: unknown) => resolve(err instanceof Error ? err : undefined));
    });
    if (closeErr === undefined) {
      throw new Error('Failed to determine server address');
    } else {
      throw new Error('Failed to determine server address', { cause: closeErr });
    }
  }
  return { port: address.port };
}

function setupServerLifecycle(args: { server: ServerType; onClose: () => Promise<void>; log: KoriLogger }): void {
  const { server, onClose, log } = args;

  // Runtime error handler
  server.on('error', (err: unknown) => {
    log.error('Server runtime error', { err });
  });

  const gracefulShutdownHandler = (): void => {
    log.info('Shutting down server...');
    let onCloseError: Error | undefined;

    void (async () => {
      try {
        await onClose();
      } catch (err) {
        onCloseError = toError(err);
        log.error('Error during graceful shutdown', { err: onCloseError });
      } finally {
        server.close((serverCloseError: unknown) => {
          if (serverCloseError) {
            log.error('Error closing HTTP server', { err: serverCloseError });
          }

          const hasError = onCloseError !== undefined || serverCloseError !== undefined;
          const exitCode = hasError ? 1 : 0;
          process.exit(exitCode);
        });
      }
    })();
  };

  process.once('SIGINT', gracefulShutdownHandler);
  process.once('SIGTERM', gracefulShutdownHandler);
}

function getDisplayHost(hostname: string): string {
  return hostname === '0.0.0.0' || hostname === '::' || hostname === '::1' ? 'localhost' : hostname;
}

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
 * @template ReqV - Request validator type or undefined
 * @template ResV - Response validator type or undefined
 * @param kori - Kori application instance to serve
 * @param options.hostname - Hostname for listen and URL reconstruction fallback (default 'localhost')
 * @param options.port - Port number for listen (default 3000)
 * @returns Promise that resolves once the server has begun listening, rejects on startup failure
 *
 * @remarks
 * - Adds process-level signal handlers (once) for graceful shutdown.
 * - Logs to the system channel via createKoriSystemLogger.
 * - On startup failure, rejects Promise with error details for caller handling.
 */
export async function startNodejsServer<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  ReqV extends KoriValidatorBase | undefined,
  ResV extends KoriValidatorBase | undefined,
>(
  kori: Kori<Env, Req, Res, ReqV, ResV>,
  options: {
    hostname?: string;
    port?: number;
  } = {},
): Promise<void> {
  const log = createKoriSystemLogger({ baseLogger: kori.log() });
  const hostname = options.hostname ?? 'localhost';
  const port = options.port ?? 3000;

  const generated = kori.generate();
  const { fetchHandler, onClose } = await generated.onStart();
  const server = createAdaptorServer({ fetch: fetchHandler });

  await startListening({ hostname, port, server, onClose, log });
  const address = await verifyAddress({ server, onClose, log });
  setupServerLifecycle({ server, onClose, log });

  const displayHost = getDisplayHost(hostname);
  const actualPort = address.port;
  log.info(`Kori server started at http://${displayHost}:${actualPort}`);
}

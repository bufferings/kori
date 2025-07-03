/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable import-x/no-nodejs-modules */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import {
  type Kori,
  type KoriEnvironment,
  type KoriRequest,
  type KoriResponse,
  type KoriRequestValidatorDefault,
  type KoriResponseValidatorDefault,
} from 'kori';

/**
 * Function to read request body asynchronously
 */
async function readRequestBody(req: IncomingMessage): Promise<string> {
  const chunks: Uint8Array[] = [];

  return new Promise((resolve, reject) => {
    req.on('data', (chunk: Uint8Array) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });

    req.on('error', (err: Error) => {
      reject(err);
    });
  });
}

/**
 * Convert Node.js HTTP request to Fetch API compatible Request object
 */
async function nodeRequestToFetchRequest(req: IncomingMessage): Promise<Request> {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const method = req.method || 'GET';
  const headers = new Headers();

  // Copy headers
  Object.entries(req.headers).forEach(([key, value]) => {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else {
        headers.append(key, value);
      }
    }
  });

  // Read body
  const body = req.method !== 'GET' && req.method !== 'HEAD' ? await readRequestBody(req) : undefined;

  // Create new Request
  return new Request(url.toString(), {
    method,
    headers,
    body: body ? body : undefined,
  });
}

/**
 * Write Fetch API compatible Response object to Node.js HTTP response
 */
async function writeResponseToNodeResponse(fetchRes: Response, res: ServerResponse): Promise<void> {
  // Set status code
  res.statusCode = fetchRes.status;

  // Copy headers
  fetchRes.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  // Write response body
  const buffer = await fetchRes.arrayBuffer();
  res.end(Buffer.from(buffer));
}

function setupGracefulShutdown<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  ResponseValidator extends KoriResponseValidatorDefault | undefined,
>(server: Server, kori: Kori<Env, Req, Res, RequestValidator, ResponseValidator>, onClose: () => Promise<void>) {
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
    port?: number;
    host?: string;
    callback?: () => void;
    enableGracefulShutdown?: boolean;
  } = {},
): Promise<void> {
  const port = options.port || 3000;
  const host = options.host || 'localhost';

  // Get Fetch API handler
  const generated = kori.generate();
  const { fetchHandler, onClose } = await generated.onInit();

  // Create HTTP server
  const server = createServer(async (req, res) => {
    try {
      // Convert Node.js request to Fetch compatible request
      const fetchReq = await nodeRequestToFetchRequest(req);

      // Process with Kori application
      const fetchRes = await fetchHandler(fetchReq);

      // Write result to Node.js response
      await writeResponseToNodeResponse(fetchRes, res);
    } catch (error) {
      kori.log.error('Error occurred during request processing', { err: error });

      // Return error response
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: {
            type: 'INTERNAL_SERVER_ERROR',
            message: 'Internal server error',
          },
        }),
      );
    }
  });

  // Start server and wait for it to be ready
  await new Promise<void>((resolve, reject) => {
    server.listen(port, host, () => {
      kori.log.info(`Kori server started at http://${host}:${port}`);
      if (options.callback) {
        try {
          options.callback();
        } catch (error) {
          // Log the error but don't prevent the Promise from resolving
          // The server has successfully started regardless of callback errors
          kori.log.error('Error in callback', { err: error });
        }
      }
      resolve();
    });

    server.on('error', (error) => {
      reject(error);
    });
  });

  if (options.enableGracefulShutdown ?? true) {
    setupGracefulShutdown(server, kori, onClose);
  }
}

export function createNodeApp<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  ResponseValidator extends KoriResponseValidatorDefault | undefined,
>(kori: Kori<Env, Req, Res, RequestValidator, ResponseValidator>) {
  return {
    listen(port = 3000, host = 'localhost', callback?: () => void): Promise<void> {
      return startNodeServer(kori, { port, host, callback });
    },
  };
}

import {
  defineKoriPlugin,
  type KoriPlugin,
  type KoriResponse,
  type KoriRequest,
  type KoriEnvironment,
  HttpStatus,
} from '@korix/kori';

import { PLUGIN_VERSION } from './version.js';

export type BodyLimitOptions = {
  /** Maximum request body size in bytes (default: 1MB) */
  maxSize?: number;
  /** Custom error handler */
  onError?: (ctx: {
    req: KoriRequest;
    res: KoriResponse;
    maxSize: number;
    receivedSize: number;
  }) => KoriResponse | undefined;
  /** Skip body limit check for certain paths (regex patterns) */
  skipPaths?: (string | RegExp)[];
  /** Enable chunked transfer encoding support (default: false) */
  enableChunkedSupport?: boolean;
};

// Constants
const DEFAULT_MAX_SIZE = 1024 * 1024; // 1MB
const PLUGIN_NAME = 'body-limit-plugin';
const LOGGER_NAME = 'body-limit';

// HTTP methods that typically have request bodies
const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Error codes
const ERROR_CODES = {
  BODY_SIZE_LIMIT_EXCEEDED: 'BODY_SIZE_LIMIT_EXCEEDED',
  INVALID_CONTENT_LENGTH: 'INVALID_CONTENT_LENGTH',
  CHUNKED_SIZE_LIMIT_EXCEEDED: 'CHUNKED_SIZE_LIMIT_EXCEEDED',
} as const;

// Compiled skip path patterns for performance
type CompiledSkipPath = {
  type: 'string' | 'regex';
  test: (path: string) => boolean;
};

/**
 * Compiles skip path patterns for efficient matching
 */
function compileSkipPaths(skipPaths: (string | RegExp)[]): CompiledSkipPath[] {
  return skipPaths.map((pattern) => ({
    type: typeof pattern === 'string' ? 'string' : 'regex',
    test: typeof pattern === 'string' ? (path: string) => path === pattern : (path: string) => pattern.test(path),
  }));
}

/**
 * Checks if a path should skip body limit validation
 */
function shouldSkipPath(pathname: string, compiledSkipPaths: CompiledSkipPath[]): boolean {
  return compiledSkipPaths.some((compiled) => compiled.test(pathname));
}

/**
 * Validates Content-Length header value according to HTTP RFC 7230
 * Must be a non-negative integer represented as a decimal string
 */
function isValidContentLength(value: string): boolean {
  // Must not be empty
  if (!value || value.length === 0) {
    return false;
  }

  // Must contain only digits (no negative sign, no letters, no whitespace)
  if (!/^\d+$/.test(value)) {
    return false;
  }

  // Parse and ensure it's within safe integer range
  const parsed = parseInt(value, 10);

  // Must not overflow JavaScript's safe integer range
  if (!Number.isSafeInteger(parsed)) {
    return false;
  }

  // Ensure parsed value exactly matches original string (catches leading zeros issues)
  if (parsed.toString() !== value) {
    return false;
  }

  return true;
}

/**
 * Validates chunked transfer encoding stream by buffering the entire stream in memory.
 * Note: This approach defeats the purpose of chunked encoding and may not be suitable for large payloads.
 * Returns either an error response or buffered data for stream replacement
 */
async function validateChunkedStream({
  originalStream,
  maxSize,
  requestLog,
}: {
  originalStream: ReadableStream<Uint8Array>;
  maxSize: number;
  requestLog: ReturnType<KoriRequest['log']>;
}): Promise<{ success: true; bufferedData: Uint8Array } | { success: false; totalSize: number }> {
  const reader = originalStream.getReader();
  const chunks: Uint8Array[] = [];
  let totalSize = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        requestLog.debug('Chunked stream validation completed', {
          totalSize,
          maxSize,
          chunksCount: chunks.length,
        });
        break;
      }

      totalSize += value.length;

      if (totalSize > maxSize) {
        requestLog.debug('Chunked stream size limit exceeded during validation', {
          totalSize,
          maxSize,
          currentChunkSize: value.length,
        });
        return { success: false, totalSize };
      }

      chunks.push(value);
    }

    // Combine all chunks into a single buffer
    const bufferedData = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      bufferedData.set(chunk, offset);
      offset += chunk.length;
    }

    return { success: true, bufferedData };
  } catch (error) {
    requestLog.error('Error during chunked stream validation', { error, totalSize });
    throw error;
  } finally {
    reader.releaseLock();
  }
}

/**
 * Creates a ReadableStream from buffered data
 */
function createBufferedStream(bufferedData: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bufferedData);
      controller.close();
    },
  });
}

/**
 * Checks if the request uses chunked transfer encoding
 */
function isChunkedTransferEncoding(transferEncodingHeader: string | undefined): boolean {
  if (!transferEncodingHeader) {
    return false;
  }

  return transferEncodingHeader.toLowerCase().includes('chunked');
}

/**
 * Validates plugin options
 */
function validateOptions(options: BodyLimitOptions): void {
  if (options.maxSize !== undefined && options.maxSize <= 0) {
    throw new Error('maxSize must be a positive number');
  }
}

/**
 * Body limit plugin for Kori framework
 *
 * Prevents large request bodies from consuming server resources by checking
 * the Content-Length header before processing the request body.
 * Optionally supports chunked transfer encoding with stream size monitoring.
 */
export function bodyLimitPlugin<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(
  options: BodyLimitOptions = {},
): KoriPlugin<Env, Req, Res> {
  // Validate options
  validateOptions(options);

  const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
  const skipPaths = options.skipPaths ?? [];
  const enableChunkedSupport = options.enableChunkedSupport ?? false;
  const compiledSkipPaths = compileSkipPaths(skipPaths);

  return defineKoriPlugin({
    name: PLUGIN_NAME,
    version: PLUGIN_VERSION,
    apply: (kori) => {
      // Instance-level logger for plugin initialization
      const log = kori.log().child(LOGGER_NAME);
      log.info(`Plugin initialized with max size: ${maxSize} bytes, chunked support: ${enableChunkedSupport}`);

      return kori.onRequest(async (ctx) => {
        const { req, res } = ctx;

        // Request-level logger with request tracing
        const requestLog = req.log().child(LOGGER_NAME);

        // Skip methods that don't typically have bodies
        if (!METHODS_WITH_BODY.has(req.method())) {
          requestLog.debug('Skipping body limit check for method without body', {
            method: req.method(),
            path: req.url().pathname,
          });
          return;
        }

        // Skip check for certain paths
        if (shouldSkipPath(req.url().pathname, compiledSkipPaths)) {
          requestLog.debug('Body limit check skipped for configured path', {
            path: req.url().pathname,
            method: req.method(),
          });
          return;
        }

        // Check Content-Length header
        const contentLengthHeader = req.headers()['content-length'];
        const transferEncodingHeader = req.headers()['transfer-encoding'];

        // If Content-Length is present, use existing validation logic
        if (contentLengthHeader) {
          // Validate Content-Length format and value
          if (!isValidContentLength(contentLengthHeader)) {
            requestLog.warn('Invalid Content-Length header value', {
              path: req.url().pathname,
              method: req.method(),
              contentLength: contentLengthHeader,
              userAgent: req.headers()['user-agent'],
            });

            return res.status(HttpStatus.BAD_REQUEST).json({
              error: 'Bad Request',
              message: 'Invalid Content-Length header',
              code: ERROR_CODES.INVALID_CONTENT_LENGTH,
            });
          }

          const contentLength = parseInt(contentLengthHeader, 10);

          if (contentLength > maxSize) {
            const xForwardedFor = req.headers()['x-forwarded-for']?.trim();
            requestLog.warn('Request body size exceeds limit', {
              path: req.url().pathname,
              method: req.method(),
              contentLength,
              maxSize,
              userAgent: req.headers()['user-agent'],
              // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
              remoteAddress: xForwardedFor || req.headers()['x-real-ip'],
            });

            // Use custom error handler if provided
            if (options.onError) {
              const result = options.onError({
                req,
                res,
                maxSize,
                receivedSize: contentLength,
              });
              if (result) {
                return result;
              }
            }

            // Default error response
            return res.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
              error: 'Payload Too Large',
              message: 'Request body size exceeds the maximum allowed limit',
              maxSize,
              receivedSize: contentLength,
              code: ERROR_CODES.BODY_SIZE_LIMIT_EXCEEDED,
            });
          }

          requestLog.debug('Body size check passed', {
            path: req.url().pathname,
            method: req.method(),
            contentLength,
            maxSize,
          });
          return;
        }

        // Handle chunked transfer encoding if enabled
        if (enableChunkedSupport && isChunkedTransferEncoding(transferEncodingHeader)) {
          requestLog.debug('Detected chunked transfer encoding, enabling stream monitoring', {
            path: req.url().pathname,
            method: req.method(),
            transferEncoding: transferEncodingHeader,
            maxSize,
          });

          // Pre-validate the chunked stream
          const originalBodyStream = req.bodyStream.bind(req);
          const stream = originalBodyStream();

          if (!stream) {
            requestLog.debug('No body stream available for chunked request');
            return;
          }

          try {
            const validationResult = await validateChunkedStream({
              originalStream: stream,
              maxSize,
              requestLog,
            });

            if (!validationResult.success) {
              const xForwardedFor = req.headers()['x-forwarded-for']?.trim();
              requestLog.warn('Chunked request body size exceeds limit', {
                path: req.url().pathname,
                method: req.method(),
                totalSize: validationResult.totalSize,
                maxSize,
                transferEncoding: transferEncodingHeader,
                userAgent: req.headers()['user-agent'],
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                remoteAddress: xForwardedFor || req.headers()['x-real-ip'],
              });

              // Use custom error handler if provided
              if (options.onError) {
                const result = options.onError({
                  req,
                  res,
                  maxSize,
                  receivedSize: validationResult.totalSize,
                });
                if (result) {
                  return result;
                }
              }

              // Default error response
              return res.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
                error: 'Payload Too Large',
                message: 'Request body size exceeds the maximum allowed limit',
                maxSize,
                receivedSize: validationResult.totalSize,
                code: ERROR_CODES.CHUNKED_SIZE_LIMIT_EXCEEDED,
              });
            }

            // Size validation passed - replace bodyStream with buffered stream
            Object.defineProperty(req, 'bodyStream', {
              value: () => createBufferedStream(validationResult.bufferedData),
              writable: true,
              configurable: true,
            });

            requestLog.debug('Chunked transfer encoding validation completed successfully', {
              path: req.url().pathname,
              method: req.method(),
              totalSize: validationResult.bufferedData.length,
              maxSize,
            });
          } catch (error) {
            requestLog.error('Error during chunked stream validation', {
              path: req.url().pathname,
              method: req.method(),
              error,
            });

            // Return internal server error for unexpected validation failures
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
              error: 'Internal Server Error',
              message: 'Failed to validate request body',
            });
          }

          return;
        }

        // No Content-Length and either chunked support is disabled or not chunked encoding
        requestLog.debug('No Content-Length header found, cannot pre-check body size', {
          path: req.url().pathname,
          method: req.method(),
          transferEncoding: transferEncodingHeader,
          chunkedSupportEnabled: enableChunkedSupport,
          isChunked: isChunkedTransferEncoding(transferEncodingHeader),
        });
      });
    },
  });
}

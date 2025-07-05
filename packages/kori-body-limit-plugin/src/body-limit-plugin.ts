import {
  defineKoriPlugin,
  type KoriPlugin,
  type KoriResponse,
  type KoriRequest,
  type KoriEnvironment,
  HttpStatus,
} from 'kori';

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
};

// Constants
const DEFAULT_MAX_SIZE = 1024 * 1024; // 1MB
const PLUGIN_NAME = 'body-limit';
const LOGGER_NAME = 'body-limit';

// HTTP methods that typically have request bodies
const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Error codes
const ERROR_CODES = {
  BODY_SIZE_LIMIT_EXCEEDED: 'BODY_SIZE_LIMIT_EXCEEDED',
  INVALID_CONTENT_LENGTH: 'INVALID_CONTENT_LENGTH',
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
 */
export function bodyLimitPlugin<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(
  options: BodyLimitOptions = {},
): KoriPlugin<Env, Req, Res> {
  // Validate options
  validateOptions(options);

  const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
  const skipPaths = options.skipPaths ?? [];
  const compiledSkipPaths = compileSkipPaths(skipPaths);

  return defineKoriPlugin({
    name: PLUGIN_NAME,
    version: '1.0.0',
    apply: (kori) => {
      // Instance-level logger for plugin initialization
      const log = kori.log.child(LOGGER_NAME);
      log.info(`Plugin initialized with max size: ${maxSize} bytes`);

      return kori.onRequest((ctx) => {
        const { req, res } = ctx;

        // Request-level logger with request tracing
        const requestLog = req.log.child(LOGGER_NAME);

        // Skip methods that don't typically have bodies
        if (!METHODS_WITH_BODY.has(req.method)) {
          requestLog.debug('Skipping body limit check for method without body', {
            method: req.method,
            path: req.url.pathname,
          });
          return;
        }

        // Skip check for certain paths
        if (shouldSkipPath(req.url.pathname, compiledSkipPaths)) {
          requestLog.debug('Body limit check skipped for configured path', {
            path: req.url.pathname,
            method: req.method,
          });
          return;
        }

        // Check Content-Length header
        const contentLengthHeader = req.headers['content-length'];

        if (!contentLengthHeader) {
          // TODO: Support chunked transfer encoding (Transfer-Encoding: chunked)
          // For now, we can only check Content-Length header
          requestLog.debug('No Content-Length header found, cannot pre-check body size', {
            path: req.url.pathname,
            method: req.method,
            transferEncoding: req.headers['transfer-encoding'],
          });
          return;
        }

        // Validate Content-Length format and value
        if (!isValidContentLength(contentLengthHeader)) {
          requestLog.warn('Invalid Content-Length header value', {
            path: req.url.pathname,
            method: req.method,
            contentLength: contentLengthHeader,
            userAgent: req.headers['user-agent'],
          });

          return res.status(HttpStatus.BAD_REQUEST).json({
            error: 'Bad Request',
            message: 'Invalid Content-Length header',
            code: ERROR_CODES.INVALID_CONTENT_LENGTH,
          });
        }

        const contentLength = parseInt(contentLengthHeader, 10);

        if (contentLength > maxSize) {
          const xForwardedFor = req.headers['x-forwarded-for']?.trim();
          requestLog.warn('Request body size exceeds limit', {
            path: req.url.pathname,
            method: req.method,
            contentLength,
            maxSize,
            userAgent: req.headers['user-agent'],
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            remoteAddress: xForwardedFor || req.headers['x-real-ip'],
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
          path: req.url.pathname,
          method: req.method,
          contentLength,
          maxSize,
        });
      });
    },
  });
}

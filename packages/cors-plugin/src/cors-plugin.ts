import {
  defineKoriPlugin,
  type KoriPlugin,
  type KoriResponse,
  type KoriRequest,
  type KoriEnvironment,
  HttpStatus,
} from '@korits/kori';

import { PLUGIN_VERSION } from './version.js';

const PLUGIN_NAME = 'cors';
const LOGGER_NAME = 'cors';

export type CorsOptions = {
  /**
   * Configures the Access-Control-Allow-Origin header
   * - string: specific origin
   * - string[]: array of allowed origins
   * - boolean: true for '*', false to disable
   * - function: dynamic origin validation
   */
  origin?: string | string[] | boolean | ((origin: string | undefined, req: KoriRequest) => boolean);

  /**
   * Configures the Access-Control-Allow-Methods header
   * Default: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE']
   */
  methods?: string[];

  /**
   * Configures the Access-Control-Allow-Headers header
   * - string[]: specific headers
   * - boolean: true to reflect request headers, false to disable
   */
  allowedHeaders?: string[] | boolean;

  /**
   * Configures the Access-Control-Expose-Headers header
   */
  exposedHeaders?: string[];

  /**
   * Configures the Access-Control-Allow-Credentials header
   * Default: false
   */
  credentials?: boolean;

  /**
   * Configures the Access-Control-Max-Age header
   * Default: 86400 (24 hours)
   */
  maxAge?: number;

  /**
   * Handle preflight requests automatically
   * Default: true
   */
  preflightContinue?: boolean;

  /**
   * Success status code for preflight requests
   * Default: 204
   */
  optionsSuccessStatus?: number;
};

const DEFAULT_METHODS = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'];
const DEFAULT_MAX_AGE = 86400; // 24 hours
const DEFAULT_OPTIONS_SUCCESS_STATUS = HttpStatus.NO_CONTENT;

function getOriginHeader(
  origin: string | undefined,
  allowedOrigin: CorsOptions['origin'],
  req?: KoriRequest,
  credentials?: boolean,
): string | undefined {
  if (typeof allowedOrigin === 'boolean') {
    // CORS spec violation: Cannot use '*' with credentials
    // When credentials are enabled, we must echo back the specific origin
    if (allowedOrigin && credentials && origin) {
      return origin;
    }
    // When credentials are enabled but no origin is provided, deny the request
    if (allowedOrigin && credentials && !origin) {
      return undefined;
    }
    return allowedOrigin ? '*' : undefined;
  }

  if (typeof allowedOrigin === 'string') {
    return origin === allowedOrigin ? origin : undefined;
  }

  if (Array.isArray(allowedOrigin)) {
    return origin !== undefined && allowedOrigin.includes(origin) ? origin : undefined;
  }

  if (typeof allowedOrigin === 'function' && req) {
    return allowedOrigin(origin, req) ? origin : undefined;
  }

  return undefined;
}

function isPreflightRequest(req: KoriRequest): boolean {
  return req.method === 'OPTIONS' && req.headers['access-control-request-method'] !== undefined;
}

function setVaryHeader(res: KoriResponse, header: string): void {
  const existingVary = res.getHeaders().get('vary');
  if (existingVary) {
    const varyHeaders = existingVary.split(',').map((h: string) => h.trim());
    if (!varyHeaders.includes(header)) {
      res.setHeader('vary', `${existingVary}, ${header}`);
    }
  } else {
    res.setHeader('vary', header);
  }
}

/**
 * CORS plugin for Kori framework
 *
 * Handles Cross-Origin Resource Sharing (CORS) by:
 * - Adding appropriate CORS headers to responses
 * - Handling preflight OPTIONS requests
 * - Validating origins against configured rules
 */
export function corsPlugin<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(
  options: CorsOptions = {},
): KoriPlugin<Env, Req, Res> {
  const {
    origin = true,
    methods = DEFAULT_METHODS,
    allowedHeaders,
    exposedHeaders,
    credentials = false,
    maxAge = DEFAULT_MAX_AGE,
    preflightContinue = false,
    optionsSuccessStatus = DEFAULT_OPTIONS_SUCCESS_STATUS,
  } = options;

  return defineKoriPlugin({
    name: PLUGIN_NAME,
    version: PLUGIN_VERSION,
    apply: (kori: any) => {
      const log = kori.log.child(LOGGER_NAME);
      log.info('CORS plugin initialized', {
        origin: typeof origin === 'function' ? 'function' : origin,
        methods,
        credentials,
        maxAge,
      });

      return kori
        .onRequest((ctx: any) => {
          const { req, res } = ctx;
          const requestLog = req.log.child(LOGGER_NAME);

          const requestOrigin = req.headers.origin;

          // Handle preflight requests
          if (isPreflightRequest(req)) {
            requestLog.debug('Handling preflight request', {
              origin: requestOrigin,
              method: req.headers['access-control-request-method'],
              headers: req.headers['access-control-request-headers'],
            });

            // Check if origin is allowed
            const allowedOriginHeader = getOriginHeader(requestOrigin, origin, req, credentials);
            if (!allowedOriginHeader && (origin !== true || (origin === true && credentials))) {
              requestLog.warn('Preflight request rejected - origin not allowed', {
                origin: requestOrigin,
                allowedOrigin: origin,
                credentials,
                reason:
                  credentials && origin === true
                    ? 'Cannot use wildcard origin with credentials'
                    : 'Origin not in allowed list',
              });
              return res.status(HttpStatus.FORBIDDEN).json({
                error: 'CORS policy violation',
                message:
                  credentials && origin === true ? 'Cannot use wildcard origin with credentials' : 'Origin not allowed',
              });
            }

            // Set preflight headers
            if (allowedOriginHeader) {
              res.setHeader('access-control-allow-origin', allowedOriginHeader);
              if (allowedOriginHeader !== '*') {
                setVaryHeader(res, 'Origin');
              }
            }

            if (credentials) {
              res.setHeader('access-control-allow-credentials', 'true');
            }

            res.setHeader('access-control-allow-methods', methods.join(', '));

            // Handle allowed headers
            if (allowedHeaders === true) {
              const requestHeaders = req.headers['access-control-request-headers'];
              if (requestHeaders) {
                res.setHeader('access-control-allow-headers', requestHeaders);
                setVaryHeader(res, 'Access-Control-Request-Headers');
              }
            } else if (Array.isArray(allowedHeaders)) {
              res.setHeader('access-control-allow-headers', allowedHeaders.join(', '));
            }

            res.setHeader('access-control-max-age', maxAge.toString());

            if (!preflightContinue) {
              requestLog.debug('Preflight request completed', {
                origin: requestOrigin,
                status: optionsSuccessStatus,
              });
              return res.status(optionsSuccessStatus).empty();
            }
          }

          // For non-preflight requests, we'll handle CORS headers in onResponse
          return undefined;
        })
        .onResponse((ctx: any) => {
          const { req, res } = ctx;
          const requestLog = req.log.child(LOGGER_NAME);

          const requestOrigin = req.headers.origin;

          // Skip if this was a preflight request that was already handled
          if (isPreflightRequest(req) && !preflightContinue) {
            return;
          }

          requestLog.debug('Adding CORS headers to response', {
            origin: requestOrigin,
            method: req.method,
          });

          // Set origin header
          const allowedOriginHeader = getOriginHeader(requestOrigin, origin, req, credentials);
          if (allowedOriginHeader) {
            res.setHeader('access-control-allow-origin', allowedOriginHeader);
            if (allowedOriginHeader !== '*') {
              setVaryHeader(res, 'Origin');
            }
          }

          // Set credentials header
          if (credentials) {
            res.setHeader('access-control-allow-credentials', 'true');
          }

          // Set exposed headers
          if (exposedHeaders && exposedHeaders.length > 0) {
            res.setHeader('access-control-expose-headers', exposedHeaders.join(', '));
          }

          requestLog.debug('CORS headers added successfully', {
            origin: requestOrigin,
            allowedOrigin: allowedOriginHeader,
            credentials,
          });
        });
    },
  });
}

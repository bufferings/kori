import {
  defineKoriPlugin,
  type KoriPlugin,
  type KoriResponse,
  type KoriRequest,
  type KoriEnvironment,
  HttpStatus,
} from '@korix/kori';

import { type CorsPluginOptions } from './cors-plugin-options.js';
import { PLUGIN_VERSION } from './version.js';

const PLUGIN_NAME = 'cors-plugin';

const DEFAULT_METHODS = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'];
const DEFAULT_MAX_AGE = 24 * 60 * 60;
const DEFAULT_OPTIONS_SUCCESS_STATUS = HttpStatus.NO_CONTENT;

const CORS_HEADERS = {
  ORIGIN: 'origin',
  ACCESS_CONTROL_REQUEST_METHOD: 'access-control-request-method',
  ACCESS_CONTROL_REQUEST_HEADERS: 'access-control-request-headers',
  ACCESS_CONTROL_ALLOW_ORIGIN: 'access-control-allow-origin',
  ACCESS_CONTROL_ALLOW_CREDENTIALS: 'access-control-allow-credentials',
  ACCESS_CONTROL_ALLOW_METHODS: 'access-control-allow-methods',
  ACCESS_CONTROL_ALLOW_HEADERS: 'access-control-allow-headers',
  ACCESS_CONTROL_MAX_AGE: 'access-control-max-age',
  ACCESS_CONTROL_EXPOSE_HEADERS: 'access-control-expose-headers',
  VARY: 'vary',
} as const;

function isPreflightRequest(req: KoriRequest): boolean {
  return req.method() === 'OPTIONS' && req.header(CORS_HEADERS.ACCESS_CONTROL_REQUEST_METHOD) !== undefined;
}

function resolveAllowOrigin(req: KoriRequest, originOption: CorsPluginOptions['origin']): string | undefined {
  const requestOrigin = req.header(CORS_HEADERS.ORIGIN);

  if (!requestOrigin) {
    return undefined;
  }

  if (typeof originOption === 'function') {
    return originOption(requestOrigin, req) ? requestOrigin : undefined;
  }
  if (typeof originOption === 'string') {
    return requestOrigin === originOption ? originOption : undefined;
  }
  if (Array.isArray(originOption)) {
    return originOption.includes(requestOrigin) ? requestOrigin : undefined;
  }
  if (originOption === true) {
    return requestOrigin;
  }

  return undefined;
}

export function corsPlugin<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(
  userOptions: CorsPluginOptions = {},
): KoriPlugin<Env, Req, Res> {
  const options = {
    origin: userOptions.origin ?? false,
    credentials: userOptions.credentials ?? false,
    allowMethods: userOptions.allowMethods ?? DEFAULT_METHODS,
    allowHeaders: userOptions.allowHeaders ?? [],
    exposeHeaders: userOptions.exposeHeaders ?? [],
    maxAge: userOptions.maxAge ?? DEFAULT_MAX_AGE,
    optionsSuccessStatus: userOptions.optionsSuccessStatus ?? DEFAULT_OPTIONS_SUCCESS_STATUS,
  };

  // Preflight headers (static and dynamic)
  const staticPreflightHeaders: [string, string][] = [];
  const dynamicPreflightHeaders: [string, (req: KoriRequest) => string | undefined][] = [];

  staticPreflightHeaders.push([CORS_HEADERS.ACCESS_CONTROL_ALLOW_METHODS, options.allowMethods.join(', ')]);
  staticPreflightHeaders.push([CORS_HEADERS.ACCESS_CONTROL_MAX_AGE, options.maxAge.toString()]);
  if (options.credentials) {
    staticPreflightHeaders.push([CORS_HEADERS.ACCESS_CONTROL_ALLOW_CREDENTIALS, 'true']);
  }
  if (options.allowHeaders === true) {
    dynamicPreflightHeaders.push([
      CORS_HEADERS.ACCESS_CONTROL_ALLOW_HEADERS,
      (req) => req.header(CORS_HEADERS.ACCESS_CONTROL_REQUEST_HEADERS),
    ]);
  } else if (Array.isArray(options.allowHeaders) && options.allowHeaders.length > 0) {
    staticPreflightHeaders.push([CORS_HEADERS.ACCESS_CONTROL_ALLOW_HEADERS, options.allowHeaders.join(', ')]);
  }

  // Actual request headers (always static)
  const actualRequestHeaders: [string, string][] = [];
  if (options.credentials) {
    actualRequestHeaders.push([CORS_HEADERS.ACCESS_CONTROL_ALLOW_CREDENTIALS, 'true']);
  }
  if (options.exposeHeaders.length > 0) {
    actualRequestHeaders.push([CORS_HEADERS.ACCESS_CONTROL_EXPOSE_HEADERS, options.exposeHeaders.join(', ')]);
  }

  // If Access-Control-Allow-Origin can vary per request,
  // we need to add `Vary: Origin` so that caches differentiate responses.
  const varyByOrigin = typeof options.origin === 'function' || Array.isArray(options.origin);
  if (varyByOrigin) {
    staticPreflightHeaders.push([CORS_HEADERS.VARY, 'origin']);
    actualRequestHeaders.push([CORS_HEADERS.VARY, 'origin']);
  }

  return defineKoriPlugin({
    name: PLUGIN_NAME,
    version: PLUGIN_VERSION,
    apply: (kori) => {
      const log = kori.log.child(PLUGIN_NAME);
      log.info('CORS plugin initialized', {
        origin: typeof options.origin === 'function' ? 'function' : options.origin,
        credentials: options.credentials,
        allowMethods: options.allowMethods,
        allowHeaders: options.allowHeaders,
        exposeHeaders: options.exposeHeaders,
        maxAge: options.maxAge,
        optionsSuccessStatus: options.optionsSuccessStatus,
      });

      return kori
        .onRequest((ctx) => {
          if (!isPreflightRequest(ctx.req)) {
            return;
          }

          const allowedOrigin = resolveAllowOrigin(ctx.req, options.origin);
          if (!allowedOrigin) {
            return ctx.res.status(HttpStatus.FORBIDDEN).json({
              error: 'CORS: Origin not allowed',
              origin: ctx.req.header(CORS_HEADERS.ORIGIN),
            });
          }

          ctx.res.setHeader(CORS_HEADERS.ACCESS_CONTROL_ALLOW_ORIGIN, allowedOrigin);

          for (const [name, value] of staticPreflightHeaders) {
            ctx.res.setHeader(name, value);
          }

          for (const [name, valueFunc] of dynamicPreflightHeaders) {
            const value = valueFunc(ctx.req);
            if (value) {
              ctx.res.setHeader(name, value);
            }
          }
          return ctx.res.status(options.optionsSuccessStatus).empty();
        })
        .onResponse((ctx) => {
          if (isPreflightRequest(ctx.req)) {
            return;
          }

          const allowedOrigin = resolveAllowOrigin(ctx.req, options.origin);
          if (!allowedOrigin) {
            return;
          }

          ctx.res.setHeader(CORS_HEADERS.ACCESS_CONTROL_ALLOW_ORIGIN, allowedOrigin);

          for (const [name, value] of actualRequestHeaders) {
            ctx.res.setHeader(name, value);
          }
        });
    },
  });
}

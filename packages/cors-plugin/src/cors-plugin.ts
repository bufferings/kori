import {
  defineKoriPlugin,
  type KoriPlugin,
  type KoriResponse,
  type KoriRequest,
  type KoriEnvironment,
  HttpStatus,
  type KoriHandlerContext,
} from '@korix/kori';

import { type CorsPluginOptions } from './cors-plugin-options.js';
import { PLUGIN_VERSION } from './version.js';

const PLUGIN_NAME = 'cors-plugin';

const DEFAULT_METHODS = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'];
const SECONDS_IN_A_DAY = 24 * 60 * 60;
const DEFAULT_MAX_AGE = SECONDS_IN_A_DAY;
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
    return '*';
  }

  return undefined;
}

function appendVaryHeader(res: KoriResponse, field: 'Origin') {
  const header = res.getHeaders().get('vary');
  let headerValue: string;

  if (Array.isArray(header)) {
    headerValue = header.join(',');
  } else if (typeof header === 'number') {
    headerValue = String(header);
  } else {
    headerValue = header ?? '';
  }

  if (!headerValue) {
    res.setHeader('vary', field);
    return;
  }

  if (headerValue.includes('*')) {
    return;
  }

  const fields = headerValue.split(',').map((f) => f.trim());
  if (fields.some((f) => f.toLowerCase() === field.toLowerCase())) {
    return;
  }

  res.setHeader('vary', `${headerValue}, ${field}`);
}

type HeaderSetter = (ctx: KoriHandlerContext<KoriEnvironment, KoriRequest, KoriResponse>) => void;

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

  if (options.credentials && options.origin === true) {
    throw new Error(
      'CORS configuration error: The `origin` option cannot be `true` (wildcard) when `credentials` is enabled. Please specify a specific origin or a function.',
    );
  }

  const preflightHeaderSetters: HeaderSetter[] = [];
  const actualRequestHeaderSetters: HeaderSetter[] = [];

  // --- Preflight-specific headers ---
  preflightHeaderSetters.push(
    (ctx) => ctx.res.setHeader(CORS_HEADERS.ACCESS_CONTROL_ALLOW_METHODS, options.allowMethods.join(', ')),
    (ctx) => ctx.res.setHeader(CORS_HEADERS.ACCESS_CONTROL_MAX_AGE, options.maxAge.toString()),
  );
  if (options.allowHeaders.length > 0) {
    const allowHeadersValue = options.allowHeaders.join(', ');
    preflightHeaderSetters.push((ctx) =>
      ctx.res.setHeader(CORS_HEADERS.ACCESS_CONTROL_ALLOW_HEADERS, allowHeadersValue),
    );
  }

  // --- Actual request-specific headers ---
  if (options.exposeHeaders.length > 0) {
    const exposeHeadersValue = options.exposeHeaders.join(', ');
    actualRequestHeaderSetters.push((ctx) =>
      ctx.res.setHeader(CORS_HEADERS.ACCESS_CONTROL_EXPOSE_HEADERS, exposeHeadersValue),
    );
  }

  // --- Common headers for both ---
  if (options.credentials) {
    const setter: HeaderSetter = (ctx) => ctx.res.setHeader(CORS_HEADERS.ACCESS_CONTROL_ALLOW_CREDENTIALS, 'true');
    preflightHeaderSetters.push(setter);
    actualRequestHeaderSetters.push(setter);
  }

  const varyByOrigin = typeof options.origin === 'function' || Array.isArray(options.origin);
  if (varyByOrigin) {
    const setter: HeaderSetter = (ctx) => appendVaryHeader(ctx.res, 'Origin');
    preflightHeaderSetters.push(setter);
    actualRequestHeaderSetters.push(setter);
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
          for (const setHeader of preflightHeaderSetters) {
            setHeader(ctx);
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
          for (const setHeader of actualRequestHeaderSetters) {
            setHeader(ctx);
          }
        });
    },
  });
}

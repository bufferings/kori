import {
  type KoriLoggerFactory,
  type KoriLogger,
  createKoriSystemLogger,
  createRequestLogger,
} from '../logging/index.js';
import { type MaybePromise } from '../util/index.js';

import { type KoriEnvironment } from './environment.js';
import { type KoriRequest } from './request.js';
import { type KoriResponse } from './response.js';

/**
 * Handler context provides access to environment, request, response, and utilities
 * for processing a specific HTTP request.
 *
 * The context allows extending request/response objects with additional properties
 * and provides logging capabilities and deferred callback execution.
 *
 * @template Env - Environment type containing instance-specific data
 * @template Req - Request type with request-specific data and methods
 * @template Res - Response type with response building capabilities
 */
export type KoriHandlerContext<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse> = {
  /** Environment containing shared instance data like database connections and config */
  env: Env;

  /** Request object for accessing HTTP data, headers, body, and query parameters */
  req: Req;

  /** Response object for setting status, headers, body content, and cookies */
  res: Res;

  /**
   * Extends the request object with additional properties.
   *
   * Performance Note: This method mutates the existing request object
   * rather than creating a new one for hot path optimization.
   *
   * @param reqExt - Additional properties to add to the request
   * @returns The same context instance with extended request type
   *
   * @example
   * ```typescript
   * // Add authentication data from plugin
   * const authCtx = ctx.withReq({
   *   userId: 'user-123',
   *   role: 'admin',
   *   isAuthenticated: true
   * });
   *
   * // Now available in handlers
   * if (authCtx.req.isAuthenticated) {
   *   authCtx.log().info('Authenticated user access', {
   *     userId: authCtx.req.userId,
   *     role: authCtx.req.role
   *   });
   * }
   * ```
   */
  withReq<ReqExt extends object>(reqExt: ReqExt): KoriHandlerContext<Env, Req & ReqExt, Res>;

  /**
   * Extends the response object with additional properties.
   *
   * Performance Note: This method mutates the existing response object
   * rather than creating a new one for hot path optimization.
   *
   * @param resExt - Additional properties to add to the response
   * @returns The same context instance with extended response type
   *
   * @example
   * ```typescript
   * // Add custom response methods
   * const apiCtx = ctx.withRes({
   *   success: (data: unknown) => ctx.res.json({ success: true, data }),
   *   paginated: (items: unknown[], total: number) =>
   *     ctx.res.json({ items, pagination: { total, count: items.length } })
   * });
   *
   * // Use the custom methods
   * return apiCtx.res.success({ message: 'User created' });
   * ```
   */
  withRes<ResExt extends object>(resExt: ResExt): KoriHandlerContext<Env, Req, Res & ResExt>;

  /**
   * Registers a callback to be executed after the handler completes but before the response is sent.
   *
   * Deferred callbacks are executed in LIFO order (last registered, first executed)
   * and are used for post-request processing like setting response headers,
   * collecting metrics, logging, and cleanup operations.
   *
   * @param callback - Function to execute after handler completion
   *
   * @example
   * ```typescript
   * // Set response headers after handler execution
   * ctx.defer((ctx) => {
   *   ctx.res.setHeader('x-request-id', ctx.req.requestId);
   *   ctx.res.setHeader('x-response-time', `${Date.now() - ctx.req.startTime}ms`);
   * });
   *
   * // Collect metrics and log completion
   * ctx.defer((ctx) => {
   *   ctx.log().info('Request completed', {
   *     status: ctx.res.getStatus(),
   *     duration: Date.now() - ctx.req.startTime
   *   });
   * });
   * ```
   */
  defer(callback: (ctx: KoriHandlerContext<Env, Req, Res>) => MaybePromise<void>): void;

  /**
   * Gets the request logger for this specific request.
   *
   * Uses channel 'app' and name 'request'. The logger is cached per request for performance.
   *
   * @returns Request logger instance
   */
  log(): KoriLogger;
};

/** Base handler context type for internal use */
type KoriHandlerContextBase = KoriHandlerContext<KoriEnvironment, KoriRequest, KoriResponse>;

/** Internal state structure for handler context */
type HandlerCtxState = {
  env: KoriEnvironment;
  req: KoriRequest;
  res: KoriResponse;
  deferStack: ((ctx: KoriHandlerContextBase) => MaybePromise<void>)[];
  loggerFactory: KoriLoggerFactory;
  loggerCache?: KoriLogger;
};

/**
 * Gets the request-scoped logger, caching it for performance.
 *
 * @param ctx - Handler context state
 * @returns Cached request-scoped logger instance
 */
function getLoggerInternal(ctx: HandlerCtxState): KoriLogger {
  ctx.loggerCache ??= createRequestLogger(ctx.loggerFactory);
  return ctx.loggerCache;
}

/** Shared methods prototype for memory efficiency */
const handlerContextPrototype = {
  withReq<ReqExt extends object>(this: HandlerCtxState, reqExt: ReqExt) {
    Object.assign(this.req, reqExt);
    return this;
  },

  withRes<ResExt extends object>(this: HandlerCtxState, resExt: ResExt) {
    Object.assign(this.res, resExt);
    return this;
  },

  defer(this: HandlerCtxState, callback: (ctx: KoriHandlerContextBase) => MaybePromise<void>) {
    this.deferStack.push(callback);
  },

  log(this: HandlerCtxState) {
    return getLoggerInternal(this);
  },
};

/**
 * Creates a new handler context instance.
 *
 * @packageInternal Framework infrastructure for creating handler contexts
 *
 * @param options.env - Environment object
 * @param options.req - Request object
 * @param options.res - Response object
 * @param options.loggerFactory - Factory function for creating loggers
 * @returns New handler context instance
 */
export function createKoriHandlerContext<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
>({
  env,
  req,
  res,
  loggerFactory,
}: {
  env: Env;
  req: Req;
  res: Res;
  loggerFactory: KoriLoggerFactory;
}): KoriHandlerContext<Env, Req, Res> {
  const ctx = Object.create(handlerContextPrototype) as HandlerCtxState;
  ctx.env = env;
  ctx.req = req;
  ctx.res = res;
  ctx.deferStack = [];
  ctx.loggerFactory = loggerFactory;
  return ctx as unknown as KoriHandlerContext<Env, Req, Res>;
}

/**
 * Executes all deferred callbacks registered during request processing.
 *
 * @packageInternal Framework infrastructure for executing deferred callbacks
 *
 * Callbacks are executed in LIFO order (last registered, first executed).
 * If any callback throws an error, it's logged but doesn't prevent other
 * callbacks from executing.
 *
 * @param ctx - Handler context containing deferred callbacks
 */
export async function executeHandlerDeferredCallbacks(ctx: KoriHandlerContextBase): Promise<void> {
  const ctxState = ctx as unknown as HandlerCtxState;
  const deferStack = ctxState.deferStack;

  // Execute in reverse order (LIFO)
  for (let i = deferStack.length - 1; i >= 0; i--) {
    const callback = deferStack[i];
    if (!callback) {
      continue;
    }

    try {
      await callback(ctx);
    } catch (err) {
      const sys = createKoriSystemLogger({ baseLogger: getLoggerInternal(ctxState) });
      sys.error('Defer callback error:', {
        type: 'defer-callback',
        callbackIndex: i,
        err: sys.serializeError(err),
      });
    }
  }
}

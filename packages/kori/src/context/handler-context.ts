import { KoriLoggerUtils, type KoriLoggerFactory, serializeError, type KoriLogger } from '../logging/index.js';
import { type MaybePromise } from '../util/index.js';

import { type KoriEnvironment } from './environment.js';
import { type KoriRequest } from './request.js';
import { type KoriResponse } from './response.js';

export type KoriHandlerContext<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse> = {
  env: Env;
  req: Req;
  res: Res;

  withReq<ReqExt>(reqExt: ReqExt): KoriHandlerContext<Env, Req & ReqExt, Res>;
  withRes<ResExt>(resExt: ResExt): KoriHandlerContext<Env, Req, Res & ResExt>;

  defer(callback: (ctx: KoriHandlerContext<Env, Req, Res>) => MaybePromise<void>): void;

  log(): KoriLogger;
  createSysLogger(): KoriLogger;
  createPluginLogger(pluginName: string): KoriLogger;
};

// --- Internal Implementation ---

type KoriHandlerContextBase = KoriHandlerContext<KoriEnvironment, KoriRequest, KoriResponse>;

type HandlerCtxState = {
  env: KoriEnvironment;
  req: KoriRequest;
  res: KoriResponse;
  deferStack: ((ctx: KoriHandlerContextBase) => MaybePromise<void>)[];
  loggerFactory: KoriLoggerFactory;
  loggerCache?: KoriLogger;
};

function getLoggerInternal(ctx: HandlerCtxState): KoriLogger {
  ctx.loggerCache ??= KoriLoggerUtils.createRequestLogger(ctx.loggerFactory);
  return ctx.loggerCache;
}

function createSysLogger(ctx: HandlerCtxState) {
  return KoriLoggerUtils.createSysLogger({
    logger: getLoggerInternal(ctx),
  });
}

function createPluginLogger(ctx: HandlerCtxState, pluginName: string) {
  return KoriLoggerUtils.createPluginLogger({
    logger: getLoggerInternal(ctx),
    pluginName,
  });
}

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

  createSysLogger(this: HandlerCtxState) {
    return createSysLogger(this);
  },

  createPluginLogger(this: HandlerCtxState, pluginName: string) {
    return createPluginLogger(this, pluginName);
  },
};

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
  loggerFactory: (meta: { channel: string; name: string }) => KoriLogger;
}): KoriHandlerContext<Env, Req, Res> {
  const ctx = Object.create(handlerContextPrototype) as HandlerCtxState;
  ctx.env = env;
  ctx.req = req;
  ctx.res = res;
  ctx.deferStack = [];
  ctx.loggerFactory = loggerFactory;
  return ctx as unknown as KoriHandlerContext<Env, Req, Res>;
}

// Internal function to execute deferred callbacks
export async function executeHandlerDeferredCallbacks(ctx: KoriHandlerContextBase): Promise<void> {
  const ctxState = ctx as unknown as HandlerCtxState;
  const deferStack = ctxState.deferStack;

  // Execute in reverse order (LIFO)
  for (let i = deferStack.length - 1; i >= 0; i--) {
    try {
      await deferStack[i]?.(ctx);
    } catch (err) {
      ctx.createSysLogger().error('Defer callback error:', {
        type: 'defer-callback',
        err: serializeError(err),
      });
    }
  }
}

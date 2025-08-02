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
};

// --- Internal Implementation ---

type KoriHandlerContextBase = KoriHandlerContext<KoriEnvironment, KoriRequest, KoriResponse>;

type HandlerCtxState = {
  env: KoriEnvironment;
  req: KoriRequest;
  res: KoriResponse;
  deferStack: ((ctx: KoriHandlerContextBase) => MaybePromise<void>)[];
};

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
};

export function createKoriHandlerContext<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
>({ env, req, res }: { env: Env; req: Req; res: Res }): KoriHandlerContext<Env, Req, Res> {
  const ctx = Object.create(handlerContextPrototype) as HandlerCtxState;
  ctx.env = env;
  ctx.req = req;
  ctx.res = res;
  ctx.deferStack = [];
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
    } catch (error) {
      ctx.req.log().error('Defer callback error:', { error });
    }
  }
}

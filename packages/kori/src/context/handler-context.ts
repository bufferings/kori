import { type KoriEnvironment } from './environment.js';
import { type KoriRequest } from './request.js';
import { type KoriResponse } from './response.js';

export type KoriHandlerContext<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse> = {
  env: Env;
  req: Req;
  res: Res;
  withReq<ReqExt>(reqExt: ReqExt): KoriHandlerContext<Env, Req & ReqExt, Res>;
  withRes<ResExt>(resExt: ResExt): KoriHandlerContext<Env, Req, Res & ResExt>;
};

// --- Internal Implementation ---

type CtxState = {
  env: KoriEnvironment;
  req: KoriRequest;
  res: KoriResponse;
};

const handlerContextPrototype = {
  withReq<ReqExt extends object>(this: CtxState & { req: KoriRequest }, reqExt: ReqExt) {
    Object.assign(this.req, reqExt);
    return this;
  },

  withRes<ResExt extends object>(this: CtxState, resExt: ResExt) {
    Object.assign(this.res, resExt);
    return this;
  },
};

export function createKoriHandlerContext<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
>({ env, req, res }: { env: Env; req: Req; res: Res }): KoriHandlerContext<Env, Req, Res> {
  const ctx = Object.create(handlerContextPrototype) as CtxState;
  ctx.env = env;
  ctx.req = req;
  ctx.res = res;
  return ctx as unknown as KoriHandlerContext<Env, Req, Res>;
}

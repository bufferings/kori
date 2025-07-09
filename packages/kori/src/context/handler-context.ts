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

export function createKoriHandlerContext<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
>({ env, req, res }: { env: Env; req: Req | (() => Req); res: Res }): KoriHandlerContext<Env, Req, Res> {
  let reqCache: Req | undefined;

  const context: KoriHandlerContext<Env, Req, Res> = {
    env,
    get req() {
      if (!reqCache) {
        reqCache = typeof req === 'function' ? req() : req;
      }
      return reqCache;
    },
    res,
    withReq: function <ReqExt>(reqExt: ReqExt) {
      // When extending req, we need to resolve it first
      return createKoriHandlerContext({ env, req: { ...context.req, ...reqExt }, res });
    },
    withRes: function <ResExt>(resExt: ResExt) {
      // Pass the lazy req as-is when extending res
      return createKoriHandlerContext({ env, req, res: { ...res, ...resExt } });
    },
  };

  return context;
}

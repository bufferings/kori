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
>({ env, req, res }: { env: Env; req: Req; res: Res }): KoriHandlerContext<Env, Req, Res> {
  return {
    env,
    req,
    res,
    withReq: function <ReqExt>(reqExt: ReqExt) {
      return createKoriHandlerContext({ env, req: { ...req, ...reqExt }, res });
    },
    withRes: function <ResExt>(resExt: ResExt) {
      return createKoriHandlerContext({ env, req, res: { ...res, ...resExt } });
    },
  };
}

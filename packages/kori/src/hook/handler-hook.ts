import {
  type KoriEnvironment,
  type KoriHandlerContext,
  type KoriRequest,
  type KoriResponse,
} from '../context/index.js';
import { type MaybePromise } from '../util/index.js';

export type OnRequestReturnValue<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  ReqExt = unknown,
  ResExt = unknown,
> = KoriHandlerContext<Env, Req & ReqExt, Res & ResExt> | KoriResponse | void;

export type KoriOnRequestHook<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  ReqExt = unknown,
  ResExt = unknown,
> = (ctx: KoriHandlerContext<Env, Req, Res>) => MaybePromise<OnRequestReturnValue<Env, Req, Res, ReqExt, ResExt>>;

export type KoriOnErrorHook<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse> = (
  ctx: KoriHandlerContext<Env, Req, Res>,
  err: unknown,
) => MaybePromise<void | KoriResponse>;

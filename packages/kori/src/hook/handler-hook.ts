import {
  type KoriEnvironment,
  type KoriHandlerContext,
  type KoriRequest,
  type KoriResponse,
} from '../context/index.js';
import { type MaybePromise } from '../utils/index.js';

export type KoriOnRequestHook<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  ReqExt = unknown,
  ResExt = unknown,
> = (
  ctx: KoriHandlerContext<Env, Req, Res>,
) => MaybePromise<KoriHandlerContext<Env, Req & ReqExt, Res & ResExt> | KoriResponse | void>;

export type KoriOnResponseHook<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse> = (
  ctx: KoriHandlerContext<Env, Req, Res>,
) => MaybePromise<void>;

export type KoriOnErrorHook<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse> = (
  ctx: KoriHandlerContext<Env, Req, Res>,
  err: unknown,
) => MaybePromise<void>;

export type KoriOnFinallyHook<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse> = (
  ctx: KoriHandlerContext<Env, Req, Res>,
) => MaybePromise<void>;

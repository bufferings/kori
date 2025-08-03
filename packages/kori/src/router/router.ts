import {
  type KoriEnvironment,
  type KoriHandlerContext,
  type KoriRequest,
  type KoriResponse,
} from '../context/index.js';
import { type MaybePromise } from '../util/index.js';

import { type WithPathParams } from './path-param-types.js';

export type KoriRouterHandler<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse> = (
  ctx: KoriHandlerContext<Env, Req, Res>,
) => MaybePromise<KoriResponse>;

export type KoriRouteOptions<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  Path extends string,
> = {
  method: string;
  path: Path;
  handler: KoriRouterHandler<Env, WithPathParams<Req, Path>, Res>;
};

export type KoriRoutingMatch = {
  handler: KoriRouterHandler<KoriEnvironment, KoriRequest, KoriResponse>;
  pathParams: Record<string, string>;
  pathTemplate: string;
};

export type KoriCompiledRouter = (request: Request) => KoriRoutingMatch | undefined;

export type KoriRouter = {
  addRoute: <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse, Path extends string>(
    options: KoriRouteOptions<Env, Req, Res, Path>,
  ) => void;
  compile: () => KoriCompiledRouter;
};

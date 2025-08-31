import {
  type KoriEnvironment,
  type KoriRequest,
  type KoriResponse,
  type KoriHandlerContext,
} from '../../context/index.js';
import { type KoriRequestSchemaDefault } from '../../request-schema/index.js';
import { type KoriResponseSchemaDefault } from '../../response-schema/index.js';
import { type KoriRouteId } from '../../route-matcher/index.js';
import { type KoriHandler, type KoriRoutePluginMetadata } from '../../routing/index.js';

export type RouteRecord<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  Path extends string = string,
> = {
  method: string;
  path: Path;
  handler: KoriHandler<Env, Req, Res, Path, undefined, undefined>;
  requestSchema?: KoriRequestSchemaDefault;
  responseSchema?: KoriResponseSchemaDefault;
  onRequestValidationError?: (ctx: KoriHandlerContext<Env, Req, Res>, err: unknown) => unknown;
  onResponseValidationError?: (ctx: KoriHandlerContext<Env, Req, Res>, err: unknown) => unknown;
  pluginMetadata?: KoriRoutePluginMetadata;
};

export function createRouteRegistry<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(): {
  register<Path extends string>(record: RouteRecord<Env, Req, Res, Path>): KoriRouteId;
  get<Path extends string>(routeId: KoriRouteId): RouteRecord<Env, Req, Res, Path> | undefined;
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const idToRecord = new Map<KoriRouteId, RouteRecord<Env, Req, Res, any>>();

  return {
    register<Path extends string>(record: RouteRecord<Env, Req, Res, Path>): KoriRouteId {
      const id = Symbol('kori-route');
      idToRecord.set(id, record);
      return id;
    },

    get<Path extends string>(routeId: KoriRouteId): RouteRecord<Env, Req, Res, Path> | undefined {
      return idToRecord.get(routeId) as RouteRecord<Env, Req, Res, Path> | undefined;
    },
  } as const;
}

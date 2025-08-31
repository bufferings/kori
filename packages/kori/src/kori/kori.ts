import { type KoriEnvironment, type KoriRequest, type KoriResponse } from '../context/index.js';
import { type KoriFetchHandler } from '../fetch-handler/index.js';
import { type KoriOnErrorHook, type KoriOnRequestHook, type KoriOnStartHook } from '../hook/index.js';
import { type KoriLogger } from '../logging/index.js';
import { type KoriPlugin } from '../plugin/index.js';
import { type KoriRequestValidatorDefault } from '../request-validator/index.js';
import { type KoriResponseValidatorDefault } from '../response-validator/index.js';
import { type KoriRouteDefinition, type KoriRoute, type KoriRouteMethod } from '../routing/index.js';

export type Kori<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  RequestValidator extends KoriRequestValidatorDefault | undefined = undefined,
  ResponseValidator extends KoriResponseValidatorDefault | undefined = undefined,
> = {
  // Logger
  log(): KoriLogger;

  // Lifecycle Hooks
  onStart<EnvExt extends object>(
    hook: KoriOnStartHook<Env, EnvExt>,
  ): Kori<Env & EnvExt, Req, Res, RequestValidator, ResponseValidator>;

  // Handler Hooks
  onRequest<ReqExt extends object, ResExt extends object>(
    hook: KoriOnRequestHook<Env, Req, Res, ReqExt, ResExt>,
  ): Kori<Env, Req & ReqExt, Res & ResExt, RequestValidator, ResponseValidator>;
  onError(hook: KoriOnErrorHook<Env, Req, Res>): Kori<Env, Req, Res, RequestValidator, ResponseValidator>;

  // Plugin
  applyPlugin<EnvExt extends object, ReqExt extends object, ResExt extends object>(
    plugin: KoriPlugin<Env, Req, Res, EnvExt, ReqExt, ResExt, RequestValidator, ResponseValidator>,
  ): Kori<Env & EnvExt, Req & ReqExt, Res & ResExt, RequestValidator, ResponseValidator>;

  // Child Creation
  createChild<EnvExt extends object, ReqExt extends object, ResExt extends object>(childOptions?: {
    configure: (
      kori: Kori<Env, Req, Res, RequestValidator, ResponseValidator>,
    ) => Kori<Env & EnvExt, Req & ReqExt, Res & ResExt, RequestValidator, ResponseValidator>;
    prefix?: string;
  }): Kori<Env & EnvExt, Req & ReqExt, Res & ResExt, RequestValidator, ResponseValidator>;

  // Routing
  route: KoriRoute<Env, Req, Res, RequestValidator, ResponseValidator>;

  get: KoriRouteMethod<Env, Req, Res, RequestValidator, ResponseValidator>;
  post: KoriRouteMethod<Env, Req, Res, RequestValidator, ResponseValidator>;
  put: KoriRouteMethod<Env, Req, Res, RequestValidator, ResponseValidator>;
  delete: KoriRouteMethod<Env, Req, Res, RequestValidator, ResponseValidator>;
  patch: KoriRouteMethod<Env, Req, Res, RequestValidator, ResponseValidator>;
  head: KoriRouteMethod<Env, Req, Res, RequestValidator, ResponseValidator>;
  options: KoriRouteMethod<Env, Req, Res, RequestValidator, ResponseValidator>;

  // Fetch Handler Generation
  generate(): KoriFetchHandler;

  // Route Definitions
  routeDefinitions(): KoriRouteDefinition[];
};

import { type KoriEnvironment, type KoriRequest, type KoriResponse } from '../context/index.js';
import { type KoriFetchHandler } from '../fetch-handler/index.js';
import { type KoriOnErrorHook, type KoriOnRequestHook, type KoriOnStartHook } from '../hook/index.js';
import { type KoriLogger } from '../logging/index.js';
import { type KoriPlugin } from '../plugin/index.js';
import { type KoriRequestSchemaDefault } from '../request-schema/index.js';
import { type KoriRequestValidatorDefault } from '../request-validator/index.js';
import { type KoriResponseSchemaDefault } from '../response-schema/index.js';
import { type KoriResponseValidatorDefault } from '../response-validator/index.js';

import { type RequestProviderCompatibility, type ResponseProviderCompatibility } from './route-options.js';
import {
  type HttpMethod,
  type KoriAddRoute,
  type KoriHandler,
  type KoriRoutePluginMetadata,
  type KoriRouteRequestValidationErrorHandler,
  type KoriRouteResponseValidationErrorHandler,
} from './route.js';

type KoriMethodAlias<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  ResponseValidator extends KoriResponseValidatorDefault | undefined,
> = {
  <Path extends string>(
    path: Path,
    handler: KoriHandler<Env, Req, Res, Path, RequestValidator, undefined>,
  ): Kori<Env, Req, Res, RequestValidator, ResponseValidator>;

  <
    Path extends string,
    RequestSchema extends KoriRequestSchemaDefault | undefined = undefined,
    ResponseSchema extends KoriResponseSchemaDefault | undefined = undefined,
  >(
    path: Path,
    options: {
      requestSchema?: RequestSchema;
      responseSchema?: ResponseSchema;
      handler: KoriHandler<Env, Req, Res, Path, RequestValidator, RequestSchema>;
      onRequestValidationError?: KoriRouteRequestValidationErrorHandler<
        Env,
        Req,
        Res,
        Path,
        RequestValidator,
        RequestSchema
      >;
      onResponseValidationError?: KoriRouteResponseValidationErrorHandler<
        Env,
        Req,
        Res,
        Path,
        ResponseValidator,
        ResponseSchema
      >;
      pluginMetadata?: KoriRoutePluginMetadata;
    } & RequestProviderCompatibility<RequestValidator, RequestSchema> &
      ResponseProviderCompatibility<ResponseValidator, ResponseSchema>,
  ): Kori<Env, Req, Res, RequestValidator, ResponseValidator>;
};

export type KoriRouteDefinition = {
  method: HttpMethod;
  path: string;
  requestSchema?: KoriRequestSchemaDefault;
  responseSchema?: KoriResponseSchemaDefault;
  pluginMetadata?: KoriRoutePluginMetadata;
};

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
  addRoute: KoriAddRoute<Env, Req, Res, RequestValidator, ResponseValidator>;

  get: KoriMethodAlias<Env, Req, Res, RequestValidator, ResponseValidator>;
  post: KoriMethodAlias<Env, Req, Res, RequestValidator, ResponseValidator>;
  put: KoriMethodAlias<Env, Req, Res, RequestValidator, ResponseValidator>;
  delete: KoriMethodAlias<Env, Req, Res, RequestValidator, ResponseValidator>;
  patch: KoriMethodAlias<Env, Req, Res, RequestValidator, ResponseValidator>;
  head: KoriMethodAlias<Env, Req, Res, RequestValidator, ResponseValidator>;
  options: KoriMethodAlias<Env, Req, Res, RequestValidator, ResponseValidator>;

  // Fetch Handler Generation
  generate(): KoriFetchHandler;

  // Route Definitions
  routeDefinitions(): KoriRouteDefinition[];
};

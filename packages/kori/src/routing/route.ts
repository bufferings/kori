import { type KoriEnvironment, type KoriRequest, type KoriResponse } from '../context/index.js';
import { type Kori } from '../kori/index.js';
import { type KoriRequestSchemaBase } from '../request-schema/index.js';
import { type KoriResponseSchemaBase } from '../response-schema/index.js';
import { type KoriValidatorBase } from '../validator/index.js';

import { type KoriHandler } from './handler.js';
import { type KoriRouteRequestValidationFailureHandler } from './request-validation-failure-handler.js';
import { type KoriRouteResponseValidationFailureHandler } from './response-validation-failure-handler.js';
import { type RouteHttpMethod } from './route-http-method.js';

/**
 * Plugin metadata attached to routes for extensibility.
 *
 * Uses symbol keys to prevent naming conflicts between plugins.
 */
export type KoriRoutePluginMeta = Record<symbol, unknown>;

/**
 * Configuration options for registering a route with complete control.
 *
 * Defines all aspects of a route including method, path, handler, schemas,
 * and failure handlers. Used by the low-level route registration API.
 */
export type KoriRouteOptions<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  Path extends string,
  ReqV extends KoriValidatorBase | undefined,
  ResV extends KoriValidatorBase | undefined,
  ReqS extends KoriRequestSchemaBase | undefined,
  ResS extends KoriResponseSchemaBase | undefined,
> = {
  method: RouteHttpMethod;
  path: Path;
  requestSchema?: ReqS;
  responseSchema?: ResS;
  handler: KoriHandler<Env, Req, Res, Path, ReqV, ReqS>;
  pluginMeta?: KoriRoutePluginMeta;
  onRequestValidationFailure?: KoriRouteRequestValidationFailureHandler<Env, Req, Res, Path, ReqV, ReqS>;
  onResponseValidationFailure?: KoriRouteResponseValidationFailureHandler<Env, Req, Res, Path, ResV, ResS>;
};

/**
 * Complete route registration function type.
 *
 * Accepts full route configuration including method and returns the enhanced Kori instance.
 * Can be used directly or via HTTP method shortcuts (get, post, etc.).
 */
export type KoriRoute<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  ReqV extends KoriValidatorBase | undefined,
  ResV extends KoriValidatorBase | undefined,
> = <
  Path extends string,
  ReqS extends KoriRequestSchemaBase | undefined = undefined,
  ResS extends KoriResponseSchemaBase | undefined = undefined,
>(
  options: KoriRouteOptions<Env, Req, Res, Path, ReqV, ResV, ReqS, ResS>,
) => Kori<Env, Req, Res, ReqV, ResV>;

/**
 * Configuration options for HTTP method route registration.
 *
 * Simplified version of KoriRouteOptions without method specification,
 * used by HTTP method shortcuts (get, post, put, etc.).
 */
export type KoriRouteMethodOptions<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  Path extends string,
  ReqV extends KoriValidatorBase | undefined,
  ResV extends KoriValidatorBase | undefined,
  ReqS extends KoriRequestSchemaBase | undefined,
  ResS extends KoriResponseSchemaBase | undefined,
> = {
  requestSchema?: ReqS;
  responseSchema?: ResS;
  handler: KoriHandler<Env, Req, Res, Path, ReqV, ReqS>;
  pluginMeta?: KoriRoutePluginMeta;
  onRequestValidationFailure?: KoriRouteRequestValidationFailureHandler<Env, Req, Res, Path, ReqV, ReqS>;
  onResponseValidationFailure?: KoriRouteResponseValidationFailureHandler<Env, Req, Res, Path, ResV, ResS>;
};

/**
 * HTTP method route registration function type.
 *
 * Supports both simple handler functions and complete route options.
 * Used by all HTTP method shortcuts (get, post, put, delete, etc.).
 */
export type KoriRouteMethod<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  ReqV extends KoriValidatorBase | undefined,
  ResV extends KoriValidatorBase | undefined,
> = {
  <Path extends string>(
    path: Path,
    handler: KoriHandler<Env, Req, Res, Path, ReqV, undefined>,
  ): Kori<Env, Req, Res, ReqV, ResV>;

  <
    Path extends string,
    ReqS extends KoriRequestSchemaBase | undefined = undefined,
    ResS extends KoriResponseSchemaBase | undefined = undefined,
  >(
    path: Path,
    options: KoriRouteMethodOptions<Env, Req, Res, Path, ReqV, ResV, ReqS, ResS>,
  ): Kori<Env, Req, Res, ReqV, ResV>;
};

/**
 * Internal union type for route registration arguments.
 *
 * This implementation detail accepts either a handler function or an options
 * object to provide a unified shape for internal helpers. The public API uses
 * function overloads for better developer experience.
 *
 * @packageInternal
 */
export type KoriRouteMethodImplOptions<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  Path extends string,
  ReqV extends KoriValidatorBase | undefined,
  ResV extends KoriValidatorBase | undefined,
  ReqS extends KoriRequestSchemaBase | undefined,
  ResS extends KoriResponseSchemaBase | undefined,
> = KoriHandler<Env, Req, Res, Path, ReqV, ReqS> | KoriRouteMethodOptions<Env, Req, Res, Path, ReqV, ResV, ReqS, ResS>;

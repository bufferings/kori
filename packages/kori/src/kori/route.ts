import {
  type KoriEnvironment,
  type KoriHandlerContext,
  type KoriRequest,
  type KoriResponse,
} from '../context/index.js';
import { type KoriRequestSchemaDefault } from '../request-schema/index.js';
import { type KoriRequestValidatorDefault } from '../request-validator/index.js';
import { type KoriResponseSchemaDefault } from '../response-schema/index.js';
import { type InferResponseValidationError, type KoriResponseValidatorDefault } from '../response-validator/index.js';
import { type WithPathParams } from '../router/index.js';
import { type MaybePromise } from '../util/index.js';

import { type Kori } from './kori.js';
import { type RequestProviderCompatibility, type ResponseProviderCompatibility } from './route-options.js';
import { type InferRequestValidationFailure, type InferValidatedRequest  } from './validated-request.js';

/**
 * HTTP request methods supported by Kori.
 *
 * Supports standard HTTP methods and custom methods via the `custom` property.
 * Custom methods must be uppercase strings for HTTP specification compliance.
 *
 * @example
 * ```typescript
 * // Standard HTTP methods
 * const getMethod: HttpMethod = 'GET';
 * const postMethod: HttpMethod = 'POST';
 *
 * // Custom HTTP method
 * const customMethod: HttpMethod = { custom: 'CUSTOM' };
 * ```
 */
export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS'
  | { custom: Uppercase<string> };

export type KoriHandler<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  Path extends string,
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  RequestSchema extends KoriRequestSchemaDefault | undefined,
> = (
  ctx: KoriHandlerContext<Env, InferValidatedRequest<WithPathParams<Req, Path>, RequestValidator, RequestSchema>, Res>,
) => MaybePromise<KoriResponse>;

export type KoriInstanceRequestValidationErrorHandler<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  RequestValidator extends KoriRequestValidatorDefault | undefined,
> = (
  ctx: KoriHandlerContext<Env, Req, Res>,
  err: InferRequestValidationFailure<RequestValidator>,
) => MaybePromise<KoriResponse | void>;

export type KoriRouteRequestValidationErrorHandler<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  Path extends string,
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  RequestSchema extends KoriRequestSchemaDefault | undefined,
> = RequestValidator extends KoriRequestValidatorDefault
  ? RequestSchema extends KoriRequestSchemaDefault
    ? (
        ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>,
        err: InferRequestValidationFailure<RequestValidator>,
      ) => MaybePromise<KoriResponse | void>
    : never
  : never;

export type KoriInstanceResponseValidationErrorHandler<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  ResponseValidator extends KoriResponseValidatorDefault | undefined,
> = (
  ctx: KoriHandlerContext<Env, Req, Res>,
  err: InferResponseValidationError<ResponseValidator>,
) => MaybePromise<KoriResponse | void>;

export type KoriRouteResponseValidationErrorHandler<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  Path extends string,
  ResponseValidator extends KoriResponseValidatorDefault | undefined,
  ResponseSchema extends KoriResponseSchemaDefault | undefined,
> = ResponseValidator extends KoriResponseValidatorDefault
  ? ResponseSchema extends KoriResponseSchemaDefault
    ? (
        ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>,
        err: InferResponseValidationError<ResponseValidator>,
      ) => MaybePromise<KoriResponse | void>
    : never
  : never;

export type KoriRoutePluginMetadata = Record<symbol, unknown>;

export type KoriAddRoute<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  ResponseValidator extends KoriResponseValidatorDefault | undefined,
> = <
  Path extends string,
  RequestSchema extends KoriRequestSchemaDefault | undefined = undefined,
  ResponseSchema extends KoriResponseSchemaDefault | undefined = undefined,
>(
  options: {
    method: HttpMethod;
    path: Path;
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
) => Kori<Env, Req, Res, RequestValidator, ResponseValidator>;

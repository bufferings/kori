import { type KoriEnvironment, type KoriRequest, type KoriResponse } from '../context/index.js';
import { type Kori } from '../kori/index.js';
import { type KoriRequestSchemaDefault } from '../request-schema/index.js';
import { type KoriRequestValidatorDefault } from '../request-validator/index.js';
import { type KoriResponseSchemaDefault } from '../response-schema/index.js';
import { type KoriResponseValidatorDefault } from '../response-validator/index.js';

import { type KoriHandler } from './handler.js';
import { type RequestProviderConstraint, type ResponseProviderConstraint } from './provider-constraint.js';
import { type KoriRouteRequestValidationErrorHandler } from './request-validation-error-handler.js';
import { type KoriRouteResponseValidationErrorHandler } from './response-validation-error-handler.js';
import { type RouteHttpMethod } from './route-http-method.js';

export type KoriRoutePluginMetadata = Record<symbol, unknown>;

export type KoriRouteMethod<
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
    } & RequestProviderConstraint<RequestValidator, RequestSchema> &
      ResponseProviderConstraint<ResponseValidator, ResponseSchema>,
  ): Kori<Env, Req, Res, RequestValidator, ResponseValidator>;
};

export type KoriRoute<
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
    method: RouteHttpMethod;
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
  } & RequestProviderConstraint<RequestValidator, RequestSchema> &
    ResponseProviderConstraint<ResponseValidator, ResponseSchema>,
) => Kori<Env, Req, Res, RequestValidator, ResponseValidator>;

import {
  type KoriEnvironment,
  type KoriHandlerContext,
  type KoriRequest,
  type KoriResponse,
} from '../context/index.js';
import { type KoriRequestSchemaDefault } from '../request-schema/index.js';
import { type KoriRequestValidator, type KoriRequestValidatorDefault } from '../request-validator/index.js';

import { type WithPathParams } from './path-params.js';
import { type RequestValidationError } from './request-validation-result.js';

export type KoriInstanceRequestValidationErrorHandler<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  RequestValidator extends KoriRequestValidatorDefault | undefined,
> = (
  ctx: KoriHandlerContext<Env, Req, Res>,
  err: InferRequestValidationFailure<RequestValidator>,
) => Promise<KoriResponse | void> | KoriResponse | void;

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
      ) => Promise<KoriResponse | void> | KoriResponse | void
    : never
  : never;

export type InferRequestValidationFailure<V> =
  V extends KoriRequestValidator<infer _Provider, infer _Schema, infer ErrorType>
    ? RequestValidationError<ErrorType>
    : never;

import {
  type KoriEnvironment,
  type KoriHandlerContext,
  type KoriRequest,
  type KoriResponse,
} from '../context/index.js';
import { type KoriResponseSchemaDefault } from '../response-schema/index.js';
import { type KoriResponseValidator, type KoriResponseValidatorDefault } from '../response-validator/index.js';

import { type WithPathParams } from './path-params.js';
import { type ResponseValidationError } from './response-validation-result.js';

export type KoriInstanceResponseValidationErrorHandler<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  ResponseValidator extends KoriResponseValidatorDefault | undefined,
> = (
  ctx: KoriHandlerContext<Env, Req, Res>,
  err: InferResponseValidationError<ResponseValidator>,
) => Promise<KoriResponse | void> | KoriResponse | void;

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
      ) => Promise<KoriResponse | void> | KoriResponse | void
    : never
  : never;

export type InferResponseValidationError<V> =
  V extends KoriResponseValidator<infer _Provider, infer _Schema, infer ErrorType>
    ? ResponseValidationError<ErrorType>
    : never;

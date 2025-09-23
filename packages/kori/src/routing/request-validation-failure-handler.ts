import {
  type KoriEnvironment,
  type KoriHandlerContext,
  type KoriRequest,
  type KoriResponse,
} from '../context/index.js';
import { type KoriRequestSchemaBase } from '../request-schema/index.js';
import { type MaybePromise } from '../util/index.js';
import { type InferValidatorFailureReason, type KoriValidatorBase } from '../validator/index.js';

import { type WithPathParams } from './path-params.js';
import { type RequestValidationFailure } from './request-validation-result.js';

/**
 * Instance-level request validation failure handler.
 *
 * Handles validation failures that occur during request processing across all routes.
 * Can provide custom responses or return void to use default handling.
 *
 * @template Env - Environment type containing instance-specific data
 * @template Req - Request type with request-specific data and methods
 * @template Res - Response type with response building capabilities
 * @template ReqV - Request validator for type-safe validation
 *
 * @param ctx - Handler context for accessing request, response, and utilities
 * @param reason - Request validation failure reason
 * @returns Custom response or void for default handling
 */
export type KoriInstanceRequestValidationFailureHandler<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  ReqV extends KoriValidatorBase | undefined,
> = ReqV extends KoriValidatorBase
  ? (
      ctx: KoriHandlerContext<Env, Req, Res>,
      reason: RequestValidationFailure<InferValidatorFailureReason<ReqV>>,
    ) => MaybePromise<KoriResponse | void>
  : never;

/**
 * Route-specific request validation failure handler.
 *
 * Provides access to path parameters and route-specific context.
 * Can override the response or return void to delegate to the instance-level handler.
 *
 * @template Env - Environment type containing instance-specific data
 * @template Req - Request type with request-specific data and methods
 * @template Res - Response type with response building capabilities
 * @template Path - URL path pattern with parameter placeholders
 * @template ReqV - Request validator for type-safe validation
 * @template ReqS - Request schema defining validation structure
 *
 * @param ctx - Handler context with path parameters
 * @param reason - Request validation failure reason
 * @returns Custom response or void to delegate to the instance-level handler
 */
export type KoriRouteRequestValidationFailureHandler<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  Path extends string,
  ReqV extends KoriValidatorBase | undefined,
  ReqS extends KoriRequestSchemaBase | undefined,
> = ReqV extends KoriValidatorBase
  ? ReqS extends KoriRequestSchemaBase
    ? (
        ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>,
        reason: RequestValidationFailure<InferValidatorFailureReason<ReqV>>,
      ) => MaybePromise<KoriResponse | void>
    : never
  : never;

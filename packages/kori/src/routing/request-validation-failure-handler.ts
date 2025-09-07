import {
  type KoriEnvironment,
  type KoriHandlerContext,
  type KoriRequest,
  type KoriResponse,
} from '../context/index.js';
import { type KoriRequestSchemaDefault } from '../request-schema/index.js';
import { type KoriRequestValidator, type KoriRequestValidatorDefault } from '../request-validator/index.js';
import { type MaybePromise } from '../util/index.js';

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
 * @template RequestValidator - Request validator for type-safe validation
 *
 * @param ctx - Handler context for accessing request, response, and utilities
 * @param reason - Request validation failure reason
 * @returns Custom response or void for default handling
 *
 * @example
 * ```typescript
 * const instanceFailureHandler = (ctx, reason) => {
 *   if (reason.body?.type === 'UNSUPPORTED_MEDIA_TYPE') {
 *     return ctx.res.unsupportedMediaType();
 *   }
 *   return ctx.res.badRequest({ message: 'Invalid request data' });
 * };
 * ```
 */
export type KoriInstanceRequestValidationFailureHandler<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  RequestValidator extends KoriRequestValidatorDefault | undefined,
> = (
  ctx: KoriHandlerContext<Env, Req, Res>,
  reason: InferRequestValidationFailureReason<RequestValidator>,
) => MaybePromise<KoriResponse | void>;

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
 * @template RequestValidator - Request validator for type-safe validation
 * @template RequestSchema - Request schema defining validation structure
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
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  RequestSchema extends KoriRequestSchemaDefault | undefined,
> = RequestValidator extends KoriRequestValidatorDefault
  ? RequestSchema extends KoriRequestSchemaDefault
    ? (
        ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>,
        reason: InferRequestValidationFailureReason<RequestValidator>,
      ) => MaybePromise<KoriResponse | void>
    : never
  : never;

/**
 * Extracts the validation failure reason type from a request validator.
 *
 * Provides type-safe access to validation failure reason when implementing
 * custom handlers. The inferred type includes all possible validation failure scenarios
 * (body, params, queries, headers).
 *
 * @template V - Request validator to extract validation failure reason type from
 */
export type InferRequestValidationFailureReason<V> =
  V extends KoriRequestValidator<infer _Provider, infer _Schema, infer FailureReason>
    ? RequestValidationFailure<FailureReason>
    : never;

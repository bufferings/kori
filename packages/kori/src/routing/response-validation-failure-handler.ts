import {
  type KoriEnvironment,
  type KoriHandlerContext,
  type KoriRequest,
  type KoriResponse,
} from '../context/index.js';
import { type KoriResponseSchemaDefault } from '../response-schema/index.js';
import { type KoriResponseValidator, type KoriResponseValidatorDefault } from '../response-validator/index.js';
import { type MaybePromise } from '../util/index.js';

import { type WithPathParams } from './path-params.js';
import { type ResponseValidationFailure } from './response-validation-result.js';

/**
 * Instance-level response validation failure handler.
 *
 * Handles validation failures that occur during response processing across all routes.
 * Can provide custom responses or return void to use the original response.
 *
 * @template Env - Environment type containing instance-specific data
 * @template Req - Request type with request-specific data and methods
 * @template Res - Response type with response building capabilities
 * @template ResponseValidator - Response validator for type-safe validation
 *
 * @param ctx - Handler context for accessing request, response, and utilities
 * @param reason - Response validation failure reason
 * @returns Custom response or void to keep original response
 */
export type KoriInstanceResponseValidationFailureHandler<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  ResponseValidator extends KoriResponseValidatorDefault | undefined,
> = (
  ctx: KoriHandlerContext<Env, Req, Res>,
  reason: InferResponseValidationFailureReason<ResponseValidator>,
) => MaybePromise<KoriResponse | void>;

/**
 * Route-specific response validation failure handler.
 *
 * Provides access to path parameters and route-specific context.
 * Can override the response or return void to delegate to the instance-level handler.
 *
 * @template Env - Environment type containing instance-specific data
 * @template Req - Request type with request-specific data and methods
 * @template Res - Response type with response building capabilities
 * @template Path - URL path pattern with parameter placeholders
 * @template ResponseValidator - Response validator for type-safe validation
 * @template ResponseSchema - Response schema defining validation structure
 *
 * @param ctx - Handler context with path parameters
 * @param reason - Response validation failure reason
 * @returns Custom response or void to delegate to the instance-level handler
 */
export type KoriRouteResponseValidationFailureHandler<
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
        reason: InferResponseValidationFailureReason<ResponseValidator>,
      ) => MaybePromise<KoriResponse | void>
    : never
  : never;

/**
 * Extracts the validation failure reason type from a response validator.
 *
 * Provides type-safe access to validation failure reason when implementing
 * custom handlers. The inferred type includes response validation failure scenarios
 * (body validation, status code validation).
 *
 * @template V - Response validator to extract validation failure reason type from
 */
export type InferResponseValidationFailureReason<V> =
  V extends KoriResponseValidator<infer _Provider, infer _Schema, infer FailureReason>
    ? ResponseValidationFailure<FailureReason>
    : never;

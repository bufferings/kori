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

/**
 * Instance-level response validation error handler.
 *
 * Handles validation errors that occur during response processing across all routes.
 * Can provide custom error responses or return void to use the original response.
 * Typically used for logging and monitoring rather than changing the response.
 *
 * @template Env - Environment type containing instance-specific data
 * @template Req - Request type with request-specific data and methods
 * @template Res - Response type with response building capabilities
 * @template ResponseValidator - Response validator for type-safe validation
 *
 * @param ctx - Handler context for accessing request, response, and utilities
 * @param err - Response validation error with detailed failure information
 * @returns Custom error response or void to keep original response
 *
 * @example
 * ```typescript
 * const instanceErrorHandler = (ctx, err) => {
 *   ctx.log().warn('Response validation failed', { err });
 *   // Return void to keep original response but log the issue
 *   return;
 * };
 * ```
 */
export type KoriInstanceResponseValidationErrorHandler<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  ResponseValidator extends KoriResponseValidatorDefault | undefined,
> = (
  ctx: KoriHandlerContext<Env, Req, Res>,
  err: InferResponseValidationError<ResponseValidator>,
) => Promise<KoriResponse | void> | KoriResponse | void;

/**
 * Route-specific response validation error handler.
 *
 * Handles validation errors for a specific route when both validator and schema
 * are present. Provides access to path parameters and route-specific context.
 * Can override the response or return void to delegate to instance handler.
 *
 * @template Env - Environment type containing instance-specific data
 * @template Req - Request type with request-specific data and methods
 * @template Res - Response type with response building capabilities
 * @template Path - URL path pattern with parameter placeholders
 * @template ResponseValidator - Response validator for type-safe validation
 * @template ResponseSchema - Response schema defining validation structure
 *
 * @param ctx - Handler context with path parameters
 * @param err - Response validation error with detailed failure information
 * @returns Custom error response or void to delegate to instance handler
 *
 * @example
 * ```typescript
 * app.get('/users/:id', {
 *   responseSchema: userResponseSchema,
 *   onResponseValidationError: (ctx, err) => {
 *     const userId = ctx.req.pathParams().id;
 *     ctx.log().error('User response validation failed', { userId, err });
 *     return ctx.res.internalError({ message: 'Response format error' });
 *   },
 *   handler: (ctx) => ctx.res.json({ name: 'invalid-type' })
 * });
 * ```
 */
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

/**
 * Extracts the validation error type from a response validator.
 *
 * Provides type-safe access to validation error details when implementing
 * custom response error handlers. The inferred type includes response
 * validation error scenarios (body validation, status code validation).
 *
 * @template V - Response validator to extract validation error type from
 *
 * @example
 * ```typescript
 * type MyValidationError = InferResponseValidationError<typeof myValidator>;
 * // Use in error handler for type-safe error handling
 * ```
 */
export type InferResponseValidationError<V> =
  V extends KoriResponseValidator<infer _Provider, infer _Schema, infer ErrorType>
    ? ResponseValidationError<ErrorType>
    : never;

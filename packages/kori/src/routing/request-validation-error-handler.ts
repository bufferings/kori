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

/**
 * Instance-level request validation error handler.
 *
 * Handles validation errors that occur during request processing across all routes.
 * Can provide custom error responses or return void to use default error handling.
 *
 * @template Env - Environment type containing instance-specific data
 * @template Req - Request type with request-specific data and methods
 * @template Res - Response type with response building capabilities
 * @template RequestValidator - Request validator for type-safe validation
 *
 * @param ctx - Handler context for accessing request, response, and utilities
 * @param err - Request validation error with detailed failure information
 * @returns Custom error response or void for default handling
 *
 * @example
 * ```typescript
 * const instanceErrorHandler = (ctx, err) => {
 *   if (err.body?.type === 'UNSUPPORTED_MEDIA_TYPE') {
 *     return ctx.res.unsupportedMediaType();
 *   }
 *   return ctx.res.badRequest({ message: 'Invalid request data' });
 * };
 * ```
 */
export type KoriInstanceRequestValidationErrorHandler<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  RequestValidator extends KoriRequestValidatorDefault | undefined,
> = (
  ctx: KoriHandlerContext<Env, Req, Res>,
  err: InferRequestValidationError<RequestValidator>,
) => Promise<KoriResponse | void> | KoriResponse | void;

/**
 * Route-specific request validation error handler.
 *
 * Handles validation errors for a specific route when both validator and schema
 * are present. Provides access to path parameters and route-specific context.
 *
 * @template Env - Environment type containing instance-specific data
 * @template Req - Request type with request-specific data and methods
 * @template Res - Response type with response building capabilities
 * @template Path - URL path pattern with parameter placeholders
 * @template RequestValidator - Request validator for type-safe validation
 * @template RequestSchema - Request schema defining validation structure
 *
 * @param ctx - Handler context with path parameters
 * @param err - Request validation error with detailed failure information
 * @returns Custom error response or void to delegate to instance handler
 *
 * @example
 * ```typescript
 * app.post('/users/:id', {
 *   requestSchema: userUpdateSchema,
 *   onRequestValidationError: (ctx, err) => {
 *     const userId = ctx.req.pathParams().id;
 *     ctx.log().warn('User update validation failed', { userId, err });
 *     return ctx.res.badRequest({ message: 'Invalid user data' });
 *   },
 *   handler: (ctx) => ctx.res.ok()
 * });
 * ```
 */
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
        err: InferRequestValidationError<RequestValidator>,
      ) => Promise<KoriResponse | void> | KoriResponse | void
    : never
  : never;

/**
 * Extracts the validation error type from a request validator.
 *
 * Provides type-safe access to validation error details when implementing
 * custom error handlers. The inferred type includes all possible validation
 * error scenarios (body, params, queries, headers).
 *
 * @template V - Request validator to extract validation error type from
 *
 * @example
 * ```typescript
 * type MyValidationError = InferRequestValidationError<typeof myValidator>;
 * // Use in error handler for type-safe error handling
 * ```
 */
export type InferRequestValidationError<V> =
  V extends KoriRequestValidator<infer _Provider, infer _Schema, infer ErrorType>
    ? RequestValidationError<ErrorType>
    : never;

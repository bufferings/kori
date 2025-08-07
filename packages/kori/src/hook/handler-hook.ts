import {
  type KoriEnvironment,
  type KoriHandlerContext,
  type KoriRequest,
  type KoriResponse,
} from '../context/index.js';
import { type MaybePromise } from '../util/index.js';

/**
 * Return value types for onRequest hooks.
 *
 * @template Env - Environment type
 * @template Req - Request type
 * @template Res - Response type
 * @template ReqExt - Additional request properties
 * @template ResExt - Additional response properties
 */
export type OnRequestReturnValue<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  ReqExt = unknown,
  ResExt = unknown,
> = KoriHandlerContext<Env, Req & ReqExt, Res & ResExt> | KoriResponse | void;

/**
 * Hook function type for pre-request processing operations.
 *
 * onRequest hooks execute before each route handler, allowing for authentication,
 * logging, request validation, and context extension. They can abort request
 * processing by returning a response or extend the context for downstream handlers.
 *
 * @template Env - Environment type
 * @template Req - Request type
 * @template Res - Response type
 * @template ReqExt - Additional request properties to be added
 * @template ResExt - Additional response properties to be added
 *
 * @param ctx - Handler context for accessing request, response, and utilities
 * @returns Extended context, early response, or void to continue processing
 *
 * @example
 * ```typescript
 * const authHook: KoriOnRequestHook<Env, Req, Res, { userId: string }> = async (ctx) => {
 *   const token = ctx.req.headers.get('authorization');
 *
 *   if (!token) {
 *     return ctx.res.unauthorized({ message: 'Authentication required' });
 *   }
 *
 *   const userId = await validateToken(token);
 *
 *   // Log request with defer
 *   ctx.defer(() => {
 *     ctx.log().info('Request processed', { userId, path: ctx.req.url });
 *   });
 *
 *   return ctx.withReq({ userId });
 * };
 * ```
 */
export type KoriOnRequestHook<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  ReqExt = unknown,
  ResExt = unknown,
> = (ctx: KoriHandlerContext<Env, Req, Res>) => MaybePromise<OnRequestReturnValue<Env, Req, Res, ReqExt, ResExt>>;

/**
 * Hook function type for error handling operations.
 *
 * onError hooks execute when errors occur during request processing, allowing for
 * custom error handling, logging, and response generation. They can provide
 * custom error responses or continue to the next error hook. If all hooks return
 * void, default error handling (500 Internal Server Error) will be used.
 *
 * @template Env - Environment type
 * @template Req - Request type
 * @template Res - Response type
 *
 * @param ctx - Handler context for accessing request, response, and utilities
 * @param err - The error that occurred during processing
 * @returns Custom error response or void to continue to next error hook
 *
 * @example
 * ```typescript
 * const errorHook: KoriOnErrorHook<Env, Req, Res> = async (ctx, err) => {
 *   // Log error details
 *   ctx.log().error('Request error occurred', {
 *     error: err instanceof Error ? err.message : 'Unknown error',
 *     path: ctx.req.url,
 *     method: ctx.req.method
 *   });
 *
 *   // Custom handling for validation errors
 *   if (err instanceof ValidationError) {
 *     return ctx.res.badRequest({
 *       message: 'Validation failed',
 *       details: err.details
 *     });
 *   }
 *
 *   // Continue to next error hook for other errors
 *   return;
 * };
 * ```
 */
export type KoriOnErrorHook<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse> = (
  ctx: KoriHandlerContext<Env, Req, Res>,
  err: unknown,
) => MaybePromise<void | KoriResponse>;

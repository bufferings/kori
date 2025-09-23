import {
  type KoriEnvironment,
  type KoriHandlerContext,
  type KoriRequest,
  type KoriResponse,
} from '../context/index.js';
import { type KoriRequestSchemaBase } from '../request-schema/index.js';
import { type MaybePromise } from '../util/index.js';
import { type KoriValidatorBase } from '../validator/index.js';

import { type WithPathParams } from './path-params.js';
import { type ValidatedRequest } from './validated-request.js';

/**
 * Route handler function type for processing HTTP requests.
 *
 * Handlers receive a context with validated request data and path parameters,
 * and return a response. Request validation is automatically applied when
 * both validator and schema are provided.
 *
 * @template Env - Environment type containing instance-specific data
 * @template Req - Request type with request-specific data and methods
 * @template Res - Response type with response building capabilities
 * @template Path - URL path pattern with parameter placeholders
 * @template RequestValidator - Request validator for type-safe validation
 * @template RequestSchema - Request schema defining validation structure
 *
 * @param ctx - Handler context with validated request and path parameters
 * @returns Response object or promise resolving to response
 *
 * @example
 * ```typescript
 * // Basic handler with path parameters
 * app.get('/users/:id', (ctx) => {
 *   const userId = ctx.req.pathParams().id;
 *   return ctx.res.json({ userId });
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Handler with request validation
 * app.post('/users', {
 *   requestSchema: userCreateSchema,
 *   handler: (ctx) => {
 *     const userData = ctx.req.validatedBody();
 *     return ctx.res.json({ id: generateId(), ...userData });
 *   }
 * });
 * ```
 */
export type KoriHandler<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  Path extends string,
  ReqV extends KoriValidatorBase | undefined,
  ReqS extends KoriRequestSchemaBase | undefined,
> = (
  ctx: KoriHandlerContext<Env, ValidatedRequest<WithPathParams<Req, Path>, ReqV, ReqS>, Res>,
) => MaybePromise<KoriResponse>;

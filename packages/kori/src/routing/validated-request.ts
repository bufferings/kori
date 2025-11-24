import { type KoriRequest } from '../context/index.js';
import {
  type InferRequestSchemaBodyOutput,
  type InferRequestSchemaCookiesOutput,
  type InferRequestSchemaHeadersOutput,
  type InferRequestSchemaParamsOutput,
  type InferRequestSchemaProvider,
  type InferRequestSchemaQueriesOutput,
  type KoriRequestSchemaBase,
} from '../request-schema/index.js';
import { type InferValidatorProvider, type KoriValidatorBase } from '../validator/index.js';

/**
 * Extends a request type with validation methods when validator and schema are present.
 *
 * Provides type-safe access to validated request data through dedicated methods.
 * Validation methods are only available when both validator and schema are configured,
 * ensuring compile-time safety and preventing runtime errors.
 *
 * @template Req - Base request type to extend
 * @template ReqV - Request validation configuration for type-safe request validation
 * @template ReqS - Request schema for type-safe request validation
 *
 * @example
 * ```typescript
 * // Handler with validated request
 * app.post('/users', {
 *   requestSchema: userCreateSchema,
 *   handler: (ctx) => {
 *     // Type-safe access to validated data
 *     const userData = ctx.req.validatedBody();
 *     const headers = ctx.req.validatedHeaders();
 *
 *     return ctx.res.json({ id: generateId(), ...userData });
 *   }
 * });
 * ```
 */
export type ValidatedRequest<
  Req extends KoriRequest,
  ReqV extends KoriValidatorBase | undefined,
  ReqS extends KoriRequestSchemaBase | undefined,
> = Req &
  (ReqV extends KoriValidatorBase
    ? ReqS extends KoriRequestSchemaBase
      ? InferValidatorProvider<ReqV> extends InferRequestSchemaProvider<ReqS>
        ? {
            validatedParams(): InferRequestSchemaParamsOutput<ReqS>;
            validatedQueries(): InferRequestSchemaQueriesOutput<ReqS>;
            validatedHeaders(): InferRequestSchemaHeadersOutput<ReqS>;
            validatedCookies(): InferRequestSchemaCookiesOutput<ReqS>;
            validatedBody(): InferRequestSchemaBodyOutput<ReqS>;
          }
        : unknown
      : unknown
    : unknown);

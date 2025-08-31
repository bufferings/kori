import { type KoriRequest } from '../context/index.js';
import {
  type InferRequestSchemaBodyOutput,
  type InferRequestSchemaHeadersOutput,
  type InferRequestSchemaParamsOutput,
  type InferRequestSchemaQueriesOutput,
  type KoriRequestSchemaDefault,
} from '../request-schema/index.js';
import { type KoriRequestValidatorDefault } from '../request-validator/index.js';

/** Extracts validation output methods from a request schema */
type InferRequestValidationOutput<S extends KoriRequestSchemaDefault> = {
  validatedParams(): InferRequestSchemaParamsOutput<S>;
  validatedQueries(): InferRequestSchemaQueriesOutput<S>;
  validatedHeaders(): InferRequestSchemaHeadersOutput<S>;
  validatedBody(): InferRequestSchemaBodyOutput<S>;
};

/**
 * Extends a request type with validation methods when validator and schema are present.
 *
 * Provides type-safe access to validated request data through dedicated methods.
 * Validation methods are only available when both validator and schema are configured,
 * ensuring compile-time safety and preventing runtime errors.
 *
 * @template Req - Base request type to extend
 * @template RequestValidator - Request validator (optional)
 * @template RequestSchema - Request schema (optional)
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
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  RequestSchema extends KoriRequestSchemaDefault | undefined,
> = Req &
  (RequestValidator extends KoriRequestValidatorDefault
    ? RequestSchema extends KoriRequestSchemaDefault
      ? InferRequestValidationOutput<RequestSchema>
      : unknown
    : unknown);

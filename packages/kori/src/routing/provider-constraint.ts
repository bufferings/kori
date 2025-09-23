import { type InferRequestSchemaProvider, type KoriRequestSchemaBase } from '../request-schema/index.js';
import { type InferResponseSchemaProvider, type KoriResponseSchemaBase } from '../response-schema/index.js';
import { type InferValidatorProvider, type KoriValidatorBase } from '../validator/index.js';

/**
 * Type constraint ensuring request validator and request schema use compatible providers.
 *
 * Enforces that validator and schema are from the same provider ecosystem
 * (e.g., both from the same schema library). When providers don't match, produces a
 * compile-time error with descriptive message.
 *
 * @template RequestValidator - Request validator type (optional)
 * @template RequestSchema - Request schema type (optional)
 *
 * @example
 * ```typescript
 * // Valid: Same provider
 * app.post('/users', {
 *   requestValidator: myValidator,
 *   requestSchema: mySchema, // Both use same provider
 *   handler: (ctx) => ctx.res.ok()
 * } & RequestProviderConstraint<typeof myValidator, typeof mySchema>);
 * ```
 */
export type RequestProviderConstraint<
  ReqV extends KoriValidatorBase | undefined,
  ReqS extends KoriRequestSchemaBase | undefined,
> = ReqV extends KoriValidatorBase
  ? ReqS extends KoriRequestSchemaBase
    ? InferValidatorProvider<ReqV> extends InferRequestSchemaProvider<ReqS>
      ? unknown
      : { _ProviderMismatch: 'Request validator and request schema providers do not match' }
    : unknown
  : unknown;

/**
 * Type constraint ensuring response validator and response schema use compatible providers.
 *
 * Enforces that validator and schema are from the same provider ecosystem
 * (e.g., both from the same schema library). When providers don't match, produces a
 * compile-time error with descriptive message.
 *
 * @template ResponseValidator - Response validator type (optional)
 * @template ResponseSchema - Response schema type (optional)
 *
 * @example
 * ```typescript
 * // Valid: Same provider
 * app.post('/users', {
 *   responseValidator: myValidator,
 *   responseSchema: mySchema, // Both use same provider
 *   handler: (ctx) => ctx.res.ok()
 * } & ResponseProviderConstraint<typeof myValidator, typeof mySchema>);
 * ```
 */
export type ResponseProviderConstraint<
  ResV extends KoriValidatorBase | undefined,
  ResS extends KoriResponseSchemaBase | undefined,
> = ResV extends KoriValidatorBase
  ? ResS extends KoriResponseSchemaBase
    ? InferValidatorProvider<ResV> extends InferResponseSchemaProvider<ResS>
      ? unknown
      : { _ProviderMismatch: 'Response validator and response schema providers do not match' }
    : unknown
  : unknown;

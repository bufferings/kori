import { type InferRequestSchemaProvider, type KoriRequestSchemaDefault } from '../request-schema/index.js';
import { type InferRequestValidationProvider, type KoriRequestValidatorDefault } from '../request-validator/index.js';
import { type InferResponseSchemaProvider, type KoriResponseSchemaDefault } from '../response-schema/index.js';
import {
  type InferResponseValidationProvider,
  type KoriResponseValidatorDefault,
} from '../response-validator/index.js';

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
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  RequestSchema extends KoriRequestSchemaDefault | undefined,
> = RequestValidator extends KoriRequestValidatorDefault
  ? RequestSchema extends KoriRequestSchemaDefault
    ? InferRequestValidationProvider<RequestValidator> extends InferRequestSchemaProvider<RequestSchema>
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
  ResponseValidator extends KoriResponseValidatorDefault | undefined,
  ResponseSchema extends KoriResponseSchemaDefault | undefined,
> = ResponseValidator extends KoriResponseValidatorDefault
  ? ResponseSchema extends KoriResponseSchemaDefault
    ? InferResponseValidationProvider<ResponseValidator> extends InferResponseSchemaProvider<ResponseSchema>
      ? unknown
      : { _ProviderMismatch: 'Response validator and response schema providers do not match' }
    : unknown
  : unknown;

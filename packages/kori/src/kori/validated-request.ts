import { type KoriRequestValidationError } from '../_internal/request-validation-resolver/index.js';
import { type KoriRequest } from '../context/index.js';
import {
  type InferRequestSchemaBodyOutput,
  type InferRequestSchemaHeadersOutput,
  type InferRequestSchemaParamsOutput,
  type InferRequestSchemaQueriesOutput,
  type KoriRequestSchemaDefault,
} from '../request-schema/index.js';
import { type KoriRequestValidator, type KoriRequestValidatorDefault } from '../request-validator/index.js';

/**
 * Extracts validation output methods from a request schema.
 *
 * @template S - Request schema type to extract validation outputs from
 */
type InferRequestValidationOutput<S extends KoriRequestSchemaDefault> = {
  validatedParams(): InferRequestSchemaParamsOutput<S>;
  validatedQueries(): InferRequestSchemaQueriesOutput<S>;
  validatedHeaders(): InferRequestSchemaHeadersOutput<S>;
  validatedBody(): InferRequestSchemaBodyOutput<S>;
};

/**
 * Extends a request type with validation methods when validator and schema are present.
 *
 * @template Req - Base request type
 * @template RequestValidator - Request validator type (optional)
 * @template RequestSchema - Request schema type (optional)
 */
export type InferValidatedRequest<
  Req extends KoriRequest,
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  RequestSchema extends KoriRequestSchemaDefault | undefined,
> = Req &
  (RequestValidator extends KoriRequestValidatorDefault
    ? RequestSchema extends KoriRequestSchemaDefault
      ? InferRequestValidationOutput<RequestSchema>
      : unknown
    : unknown);

/**
 * Extracts the validation failure structure from a request validator.
 *
 * @template V - The request validator to extract validation failure from
 */
export type InferRequestValidationFailure<V> =
  V extends KoriRequestValidator<infer _Provider, infer _Schema, infer ErrorType>
    ? KoriRequestValidationError<ErrorType>
    : never;

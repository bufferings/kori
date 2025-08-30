import { type ResponseValidationError } from '../_internal/response-validation-resolver/index.js';
import { type KoriResponseValidator } from '../response-validator/index.js';

/**
 * Extracts the validation error type from a response validator.
 *
 * @template V - The response validator to extract validation error from
 */
export type InferResponseValidationError<V> =
  V extends KoriResponseValidator<infer _Provider, infer _Schema, infer ErrorType>
    ? ResponseValidationError<ErrorType>
    : never;

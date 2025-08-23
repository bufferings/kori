import { type KoriResponseValidationError } from './error.js';
import { type KoriResponseValidator } from './validator.js';

/**
 * Extracts the provider symbol from a response validator.
 *
 * @template V - The response validator to extract provider from
 */
export type InferResponseValidationProvider<V> =
  V extends KoriResponseValidator<infer Provider, infer _Schema, infer _ErrorType> ? Provider : never;

/**
 * Extracts the validation error type from a response validator.
 *
 * @template V - The response validator to extract validation error from
 */
export type InferResponseValidationError<V> =
  V extends KoriResponseValidator<infer _Provider, infer _Schema, infer ErrorType>
    ? KoriResponseValidationError<ErrorType>
    : never;

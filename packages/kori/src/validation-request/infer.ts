import { type KoriRequestValidationError } from './error.js';
import { type KoriRequestValidator } from './validator.js';

/**
 * Extracts the provider symbol from a request validator.
 *
 * @template V - The request validator to extract provider from
 */
export type InferRequestValidationProvider<V> =
  V extends KoriRequestValidator<infer Provider, infer _Schema, infer _ErrorType> ? Provider : never;

/**
 * Extracts the validation error type from a request validator.
 *
 * @template V - The request validator to extract validation error from
 */
export type InferRequestValidationError<V> =
  V extends KoriRequestValidator<infer _Provider, infer _Schema, infer ErrorType>
    ? KoriRequestValidationError<ErrorType>
    : never;

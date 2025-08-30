import { type KoriRequestValidator } from './validator.js';

/**
 * Extracts the provider symbol from a request validator.
 *
 * @template V - The request validator to extract provider from
 */
export type InferRequestValidationProvider<V> =
  V extends KoriRequestValidator<infer Provider, infer _Schema, infer _ErrorType> ? Provider : never;

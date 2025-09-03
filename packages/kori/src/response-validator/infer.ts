import { type KoriResponseValidator } from './validator.js';

/**
 * Extracts the provider symbol from a response validator.
 *
 * @template V - The response validator to extract provider from
 */
export type InferResponseValidationProvider<V> =
  V extends KoriResponseValidator<infer Provider, infer _Schema, infer _ErrorType> ? Provider : never;

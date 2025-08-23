import { type KoriSchema } from './schema.js';

/**
 * Extracts the provider symbol from a Kori schema.
 *
 * @template S - The Kori schema to extract provider from
 */
export type InferSchemaProvider<S> =
  S extends KoriSchema<infer Provider, infer _Definition, infer _Output> ? Provider : never;

/**
 * Extracts the output type from a Kori schema.
 *
 * @template S - The Kori schema to extract output from
 */
export type InferSchemaOutput<S> =
  S extends KoriSchema<infer _Provider, infer _Definition, infer Output> ? Output : never;

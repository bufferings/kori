import { type InferSchemaOutput } from '../schema/index.js';

import { type KoriResponseSchemaBodyItem } from './body.js';
import { type KoriResponseSchema } from './response-schema.js';

/**
 * Extracts the provider symbol from a response schema.
 *
 * @template S - The response schema to extract provider from
 */
export type InferResponseSchemaProvider<S> =
  S extends KoriResponseSchema<infer Provider, infer _Headers, infer _Body, infer _BodyMapping> ? Provider : never;

/**
 * Extracts the headers schema from a response schema.
 *
 * @template S - The response schema to extract headers from
 */
export type InferResponseSchemaHeaders<S> =
  S extends KoriResponseSchema<infer _Provider, infer Headers, infer _Body, infer _BodyMapping> ? Headers : never;

/**
 * Extracts and transforms the body schema from a response schema.
 *
 * For simple bodies, returns the schema directly.
 * For content bodies, returns a union of { mediaType, value } objects.
 *
 * @template S - The response schema to extract body from
 */
export type InferResponseSchemaBody<S> =
  S extends KoriResponseSchema<infer _Provider, infer _Headers, infer Body, infer BodyMapping>
    ? Body extends object
      ? Body
      : BodyMapping extends Record<string, KoriResponseSchemaBodyItem<infer _AnySchema>>
        ? {
            [K in keyof BodyMapping]: BodyMapping[K] extends { schema: infer SchemaInner }
              ? { mediaType: K; value: InferSchemaOutput<SchemaInner> }
              : { mediaType: K; value: InferSchemaOutput<BodyMapping[K]> };
          }[keyof BodyMapping]
        : never
    : never;

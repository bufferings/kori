import { type InferSchemaOutput } from '../schema/index.js';

import { type KoriRequestSchemaContentBodyItem } from './body-content.js';
import { type KoriRequestSchema } from './request-schema.js';

/**
 * Extracts the provider symbol from a request schema.
 *
 * @template S Request schema type
 */
export type InferRequestSchemaProvider<S> =
  S extends KoriRequestSchema<
    infer Provider,
    infer _Params,
    infer _Headers,
    infer _Queries,
    infer _Body,
    infer _BodyMapping
  >
    ? Provider
    : never;

/**
 * Extracts the path parameters output type from a request schema.
 *
 * @template S Request schema type
 */
export type InferRequestSchemaParamsOutput<S> =
  S extends KoriRequestSchema<
    infer _Provider,
    infer Params,
    infer _Headers,
    infer _Queries,
    infer _Body,
    infer _BodyMapping
  >
    ? InferSchemaOutput<Params>
    : never;

/**
 * Extracts the headers output type from a request schema.
 *
 * @template S Request schema type
 */
export type InferRequestSchemaHeadersOutput<S> =
  S extends KoriRequestSchema<
    infer _Provider,
    infer _Params,
    infer Headers,
    infer _Queries,
    infer _Body,
    infer _BodyMapping
  >
    ? InferSchemaOutput<Headers>
    : never;

/**
 * Extracts the query parameters output type from a request schema.
 *
 * @template S Request schema type
 */
export type InferRequestSchemaQueriesOutput<S> =
  S extends KoriRequestSchema<
    infer _Provider,
    infer _Params,
    infer _Headers,
    infer Queries,
    infer _Body,
    infer _BodyMapping
  >
    ? InferSchemaOutput<Queries>
    : never;

/**
 * Extracts and transforms the body output type from a request schema.
 *
 * For simple bodies, returns the schema output type directly.
 * For content bodies, returns a union of { mediaType, value } objects.
 *
 * @template S Request schema type
 */
export type InferRequestSchemaBodyOutput<S> =
  S extends KoriRequestSchema<
    infer _Provider,
    infer _Params,
    infer _Headers,
    infer _Queries,
    infer Body,
    infer BodyMapping
  >
    ? [Body] extends [never]
      ? BodyMapping extends Record<string, KoriRequestSchemaContentBodyItem<infer _AnySchema>>
        ? {
            [K in keyof BodyMapping]: BodyMapping[K] extends { schema: infer SchemaInner }
              ? { mediaType: K; value: InferSchemaOutput<SchemaInner> }
              : { mediaType: K; value: InferSchemaOutput<BodyMapping[K]> };
          }[keyof BodyMapping]
        : never
      : InferSchemaOutput<Body>
    : never;

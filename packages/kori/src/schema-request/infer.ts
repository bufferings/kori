import { type InferSchemaOutput } from '../schema/index.js';

import { type KoriRequestSchemaBodyItem } from './body.js';
import { type KoriRequestSchema } from './request-schema.js';

/**
 * Extracts the provider symbol from a request schema.
 *
 * @template S - The request schema to extract provider from
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
 * Extracts the path parameters schema from a request schema.
 *
 * @template S - The request schema to extract params from
 */
export type InferRequestSchemaParams<S> =
  S extends KoriRequestSchema<
    infer _Provider,
    infer Params,
    infer _Headers,
    infer _Queries,
    infer _Body,
    infer _BodyMapping
  >
    ? Params
    : never;

/**
 * Extracts the headers schema from a request schema.
 *
 * @template S - The request schema to extract headers from
 */
export type InferRequestSchemaHeaders<S> =
  S extends KoriRequestSchema<
    infer _Provider,
    infer _Params,
    infer Headers,
    infer _Queries,
    infer _Body,
    infer _BodyMapping
  >
    ? Headers
    : never;

/**
 * Extracts the query parameters schema from a request schema.
 *
 * @template S - The request schema to extract queries from
 */
export type InferRequestSchemaQueries<S> =
  S extends KoriRequestSchema<
    infer _Provider,
    infer _Params,
    infer _Headers,
    infer Queries,
    infer _Body,
    infer _BodyMapping
  >
    ? Queries
    : never;

/**
 * Extracts and transforms the body schema from a request schema.
 *
 * For simple bodies, returns the schema directly.
 * For content bodies, returns a union of { mediaType, value } objects.
 *
 * @template S - The request schema to extract body from
 */
export type InferRequestSchemaBody<S> =
  S extends KoriRequestSchema<
    infer _Provider,
    infer _Params,
    infer _Headers,
    infer _Queries,
    infer Body,
    infer BodyMapping
  >
    ? [Body] extends [never]
      ? BodyMapping extends Record<string, KoriRequestSchemaBodyItem<infer _AnySchema>>
        ? {
            [K in keyof BodyMapping]: BodyMapping[K] extends { schema: infer SchemaInner }
              ? { mediaType: K; value: InferSchemaOutput<SchemaInner> }
              : { mediaType: K; value: InferSchemaOutput<BodyMapping[K]> };
          }[keyof BodyMapping]
        : never
      : InferSchemaOutput<Body>
    : never;

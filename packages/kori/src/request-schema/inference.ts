import { type InferSchemaOutput, type KoriSchemaBase } from '../schema/index.js';

import { type KoriRequestSchema, type KoriRequestSchemaBase } from './schema.js';

/**
 * Extracts the provider string from a request schema.
 *
 * @template S Request schema type
 */
export type InferRequestSchemaProvider<S extends KoriRequestSchemaBase> =
  S extends KoriRequestSchema<
    infer Provider,
    infer _Params,
    infer _Headers,
    infer _Queries,
    infer _Cookies,
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
export type InferRequestSchemaParamsOutput<S extends KoriRequestSchemaBase> =
  S extends KoriRequestSchema<
    infer _Provider,
    infer Params,
    infer _Headers,
    infer _Queries,
    infer _Cookies,
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
export type InferRequestSchemaHeadersOutput<S extends KoriRequestSchemaBase> =
  S extends KoriRequestSchema<
    infer _Provider,
    infer _Params,
    infer Headers,
    infer _Queries,
    infer _Cookies,
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
export type InferRequestSchemaQueriesOutput<S extends KoriRequestSchemaBase> =
  S extends KoriRequestSchema<
    infer _Provider,
    infer _Params,
    infer _Headers,
    infer Queries,
    infer _Cookies,
    infer _Body,
    infer _BodyMapping
  >
    ? InferSchemaOutput<Queries>
    : never;

/**
 * Extracts the cookies output type from a request schema.
 *
 * @template S Request schema type
 */
export type InferRequestSchemaCookiesOutput<S extends KoriRequestSchemaBase> =
  S extends KoriRequestSchema<
    infer _Provider,
    infer _Params,
    infer _Headers,
    infer _Queries,
    infer Cookies,
    infer _Body,
    infer _BodyMapping
  >
    ? InferSchemaOutput<Cookies>
    : never;

type IsNever<T> = [T] extends [never] ? true : false;

/**
 * Extracts and transforms the body output type from a request schema.
 *
 * For simple bodies, returns the schema output type directly.
 * For content bodies, returns a union of { mediaType, value } objects.
 *
 * @template S Request schema type
 */
export type InferRequestSchemaBodyOutput<S extends KoriRequestSchemaBase> =
  S extends KoriRequestSchema<
    infer _Provider,
    infer _Params,
    infer _Headers,
    infer _Queries,
    infer _Cookies,
    infer Body,
    infer BodyMapping
  >
    ? IsNever<Body> extends false
      ? [Body] extends [KoriSchemaBase]
        ? InferSchemaOutput<Body>
        : never
      : IsNever<BodyMapping> extends false
        ? {
            [K in keyof BodyMapping]: BodyMapping[K] extends KoriSchemaBase
              ? { mediaType: K; value: InferSchemaOutput<BodyMapping[K]> }
              : never;
          }[keyof BodyMapping]
        : never
    : never;

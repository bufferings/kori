import { type InferSchemaOutput } from '../schema/index.js';

import { type KoriResponseSchema } from './schema.js';

/**
 * Extracts the provider symbol from a response schema.
 *
 * @template S Response schema type
 */
export type InferResponseSchemaProvider<S> =
  S extends KoriResponseSchema<infer Provider, infer _Responses> ? Provider : never;

/**
 * Extracts the output type for a single response entry.
 *
 * @template Entry Response entry type
 */
type InferResponseSchemaBodyOutput<Entry> = Entry extends { content: infer M }
  ? {
      [K in keyof M]: M[K] extends { schema: infer S }
        ? { mediaType: K; value: InferSchemaOutput<S> }
        : { mediaType: K; value: InferSchemaOutput<M[K]> };
    }[keyof M]
  : Entry extends { schema: infer S2 }
    ? InferSchemaOutput<S2>
    : InferSchemaOutput<Entry>;

/**
 * Map an exact code string (e.g. "404") to its class wildcard ("4XX").
 */
type ClassOf<C extends string> = C extends `${infer D}${infer _Rest}` ? `${D}XX` : never;

/**
 * Extracts the response schema body output type for a specific status code.
 *
 * Resolution order: exact -> class wildcard (e.g. "4XX") -> "default".
 *
 * @template S Response schema type
 * @template StatusCode Status code as string (e.g. "200", "404")
 */
export type InferResponseSchemaBodyOutputByStatusCode<S, StatusCode extends string> = S extends {
  responses: infer R;
}
  ? R extends Record<string, unknown>
    ? StatusCode extends keyof R
      ? InferResponseSchemaBodyOutput<R[StatusCode]>
      : ClassOf<StatusCode> extends keyof R
        ? InferResponseSchemaBodyOutput<R[ClassOf<StatusCode>]>
        : 'default' extends keyof R
          ? InferResponseSchemaBodyOutput<R['default']>
          : never
    : never
  : never;

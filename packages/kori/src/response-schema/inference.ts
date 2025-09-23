import { type InferSchemaOutput, type KoriSchemaBase } from '../schema/index.js';

import { type KoriResponseSchemaContentEntryMappingBase } from './entry-content.js';
import { type KoriResponseSchema, type KoriResponseSchemaBase, type KoriResponseSchemaEntry } from './schema.js';

/**
 * Extracts the provider string from a response schema.
 *
 * @template S Response schema type
 */
export type InferResponseSchemaProvider<S extends KoriResponseSchemaBase> =
  S extends KoriResponseSchema<infer Provider, infer _Responses> ? Provider : never;

/**
 * Extracts the output type for a single response entry.
 *
 * @template Entry Response entry type
 */
type InferResponseSchemaBodyOutput<Entry extends KoriResponseSchemaEntry<string>> = Entry extends KoriSchemaBase
  ? InferSchemaOutput<Entry>
  : Entry extends { schema: infer S extends KoriSchemaBase }
    ? InferSchemaOutput<S>
    : Entry extends { content: infer Mapping extends KoriResponseSchemaContentEntryMappingBase }
      ? {
          [K in keyof Mapping]: Mapping[K] extends KoriSchemaBase
            ? { mediaType: K; value: InferSchemaOutput<Mapping[K]> }
            : Mapping[K] extends { schema: infer S extends KoriSchemaBase }
              ? { mediaType: K; value: InferSchemaOutput<S> }
              : never;
        }[keyof Mapping]
      : never;

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
export type InferResponseSchemaBodyOutputByStatusCode<
  S extends KoriResponseSchemaBase,
  StatusCode extends string,
> = S extends {
  responses?: infer R extends Record<string, KoriResponseSchemaEntry<string>>;
}
  ? StatusCode extends keyof R
    ? InferResponseSchemaBodyOutput<R[StatusCode]>
    : ClassOf<StatusCode> extends keyof R
      ? InferResponseSchemaBodyOutput<R[ClassOf<StatusCode>]>
      : 'default' extends keyof R
        ? InferResponseSchemaBodyOutput<R['default']>
        : never
  : never;

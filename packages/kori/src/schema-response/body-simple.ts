import { type KoriSchemaDefault } from '../schema/index.js';

/**
 * Simple response body schema with optional metadata.
 *
 * This type is used for application/json responses.
 * Use KoriResponseSchemaBody for other content types.
 *
 * @template Headers - Schema for response headers
 * @template S - The Kori schema type for the response body
 *
 * @example
 * ```typescript
 * // Direct schema
 * userSchema
 * ```
 *
 * @example
 * ```typescript
 * // With description and/or examples
 * {
 *   description: 'User data',
 *   schema: userSchema,
 *   examples: {
 *     sample: { id: 1, name: 'Alice' }
 *   }
 * }
 * ```
 */
export type KoriResponseSchemaSimpleBody<Headers extends KoriSchemaDefault, S extends KoriSchemaDefault> =
  | S
  | {
      description?: string;
      headers?: Headers;
      schema: S;
      examples?: Record<string, unknown>;
      links?: Record<string, unknown>;
    };

/**
 * Default simple response body accepting any schema definition.
 */
export type KoriResponseSchemaSimpleBodyDefault = KoriResponseSchemaSimpleBody<KoriSchemaDefault, KoriSchemaDefault>;

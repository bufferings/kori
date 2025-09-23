import { type KoriSchemaBase } from '../schema/index.js';

/**
 * Simple request body schema with description and examples.
 *
 * This type is for the application/json content type.
 * Use KoriRequestSchemaContentBody for other content types.
 *
 * @template S - Kori schema type for the request body
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
 *   description: 'User registration data',
 *   schema: userSchema,
 *   examples: {
 *     sample: { name: 'Alice', email: 'alice@example.com' }
 *   }
 * }
 * ```
 */
export type KoriRequestSchemaSimpleBody<S extends KoriSchemaBase> =
  | S
  | {
      description?: string;
      schema: S;
      examples?: Record<string, unknown>;
    };

/**
 * Base simple request body accepting any schema definition.
 */
export type KoriRequestSchemaSimpleBodyBase = KoriRequestSchemaSimpleBody<KoriSchemaBase>;

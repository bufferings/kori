import { type KoriSchemaDefault } from '../schema/index.js';

/**
 * Simple request body schema with optional metadata.
 *
 * This type is for application/json content type.
 * Use KoriRequestSchemaBody for other content types.
 *
 * @template S - The Kori schema type for the request body
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
export type KoriRequestSchemaSimpleBody<S extends KoriSchemaDefault> =
  | S
  | {
      description?: string;
      schema: S;
      examples?: Record<string, unknown>;
    };

/**
 * Default simple request body accepting any schema definition.
 */
export type KoriRequestSchemaSimpleBodyDefault = KoriRequestSchemaSimpleBody<KoriSchemaDefault>;

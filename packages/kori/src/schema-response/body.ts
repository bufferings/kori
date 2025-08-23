import { type KoriSchemaDefault } from '../schema/index.js';

/**
 * Individual content type definition within a response body.
 *
 * Supports schema directly or schema with examples. Note that description
 * is handled at the container level (KoriResponseSchemaBody), not here.
 *
 * @template S - The Kori schema type for this content type
 */
export type KoriResponseSchemaBodyItem<S extends KoriSchemaDefault> =
  | S
  | {
      schema: S;
      examples?: Record<string, unknown>;
    };

/**
 * Default content item accepting any schema definition.
 */
export type KoriResponseSchemaBodyItemDefault = KoriResponseSchemaBodyItem<KoriSchemaDefault>;

/**
 * Default body mapping accepting any media type definitions.
 */
export type KoriResponseSchemaBodyMappingDefault = Record<string, KoriResponseSchemaBodyItemDefault>;

/**
 * Response body schema with explicit content type specification.
 *
 * Use this when you need to specify content types explicitly or handle multiple media types.
 * For simple application/json responses, use KoriResponseSchemaSimpleBody instead.
 *
 * @template Headers - Schema for response headers
 * @template BodyMapping - Record mapping media types to value definitions
 *
 * @example
 * ```typescript
 * {
 *   content: {
 *     'application/xml': xmlUserSchema
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * {
 *   description: 'User profile data in XML format',
 *   headers: headersSchema,
 *   content: {
 *     'application/xml': {
 *       schema: xmlUserSchema,
 *       examples: {
 *         sample: { id: 1, name: 'Alice', email: 'alice@example.com' }
 *       }
 *     }
 *   }
 * }
 * ```
 */
export type KoriResponseSchemaBody<
  Headers extends KoriSchemaDefault,
  BodyMapping extends KoriResponseSchemaBodyMappingDefault,
> = {
  description?: string;
  headers?: Headers;
  content: BodyMapping;
  links?: Record<string, unknown>;
};

/**
 * Default response body accepting any headers and content type mapping definitions.
 */
export type KoriResponseSchemaBodyDefault = KoriResponseSchemaBody<
  KoriSchemaDefault,
  KoriResponseSchemaBodyMappingDefault
>;

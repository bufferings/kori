import { type KoriSchemaDefault } from '../schema/index.js';

/**
 * Individual content type definition within a response content entry.
 *
 * Supports schema directly or schema with examples. Note that description
 * is handled at the container level (KoriResponseSchemaContentEntry), not here.
 *
 * @template S - The Kori schema type for this content type
 */
export type KoriResponseSchemaContentEntryItem<S extends KoriSchemaDefault> =
  | S
  | {
      schema: S;
      examples?: Record<string, unknown>;
    };

/**
 * Default content entry item accepting any schema definition.
 */
export type KoriResponseSchemaContentEntryItemDefault = KoriResponseSchemaContentEntryItem<KoriSchemaDefault>;

/**
 * Default content entry mapping accepting any media type definitions.
 */
export type KoriResponseSchemaContentEntryMappingDefault = Record<string, KoriResponseSchemaContentEntryItemDefault>;

/**
 * Response content entry schema with explicit content type specification.
 *
 * Use this when you need to specify content types explicitly or handle multiple media types.
 * For simple application/json responses, use KoriResponseSchemaSimpleEntry instead.
 *
 * @template Headers - Schema for response headers
 * @template ContentMapping - Record mapping media types to value definitions
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
export type KoriResponseSchemaContentEntry<
  Headers extends KoriSchemaDefault,
  ContentMapping extends KoriResponseSchemaContentEntryMappingDefault,
> = {
  description?: string;
  headers?: Headers;
  content: ContentMapping;
  links?: Record<string, unknown>;
};

/**
 * Default response content entry accepting any headers and content type mapping definitions.
 */
export type KoriResponseSchemaContentEntryDefault = KoriResponseSchemaContentEntry<
  KoriSchemaDefault,
  KoriResponseSchemaContentEntryMappingDefault
>;

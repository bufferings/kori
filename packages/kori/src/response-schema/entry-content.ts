import { type KoriSchemaBase } from '../schema/index.js';

/**
 * Individual content type definition within a response content entry.
 *
 * Supports schema directly or schema with examples. Note that description
 * is handled at the container level (KoriResponseSchemaContentEntry), not here.
 *
 * @template S - The Kori schema type for this content type
 */
export type KoriResponseSchemaContentEntryItem<S extends KoriSchemaBase> =
  | S
  | {
      schema: S;
      examples?: Record<string, unknown>;
    };

/**
 * Base content entry item accepting any schema definition.
 */
export type KoriResponseSchemaContentEntryItemBase = KoriResponseSchemaContentEntryItem<KoriSchemaBase>;

/**
 * Base content entry mapping accepting any media type definitions.
 */
export type KoriResponseSchemaContentEntryMappingBase = Record<string, KoriResponseSchemaContentEntryItemBase>;

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
  Headers extends KoriSchemaBase,
  ContentMapping extends KoriResponseSchemaContentEntryMappingBase,
> = {
  description?: string;
  headers?: Headers;
  content: ContentMapping;
  links?: Record<string, unknown>;
};

/**
 * Base response content entry accepting any headers and content type mapping definitions.
 */
export type KoriResponseSchemaContentEntryBase = KoriResponseSchemaContentEntry<
  KoriSchemaBase,
  KoriResponseSchemaContentEntryMappingBase
>;

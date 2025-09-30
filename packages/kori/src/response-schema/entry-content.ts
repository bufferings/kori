import { type KoriSchemaBase } from '../schema/index.js';

/**
 * Response content entry schema with explicit content type specification.
 *
 * Use this when you need to specify content types explicitly or handle multiple media types.
 * For simple application/json responses, pass the schema directly.
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
 *     'application/xml': xmlUserSchema
 *   }
 * }
 * ```
 */
export type KoriResponseSchemaContentEntry<
  Headers extends KoriSchemaBase,
  ContentMapping extends Record<string, KoriSchemaBase>,
> = {
  description?: string;
  headers?: Headers;
  content: ContentMapping;
};

/**
 * Base response content entry accepting any headers and content type mapping definitions.
 */
export type KoriResponseSchemaContentEntryBase = KoriResponseSchemaContentEntry<
  KoriSchemaBase,
  Record<string, KoriSchemaBase>
>;

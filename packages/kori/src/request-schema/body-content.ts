import { type KoriSchemaBase } from '../schema/index.js';

/**
 * Individual content type definition within a request body.
 *
 * Supports schema directly or schema with examples. Note that description
 * is handled at the container level (KoriRequestSchemaContentBody), not here.
 *
 * @template S - The Kori schema type for this content type
 */
export type KoriRequestSchemaContentBodyItem<S extends KoriSchemaBase> =
  | S
  | {
      schema: S;
      examples?: Record<string, unknown>;
    };

/**
 * Base content body item accepting any schema definition.
 */
export type KoriRequestSchemaContentBodyItemBase = KoriRequestSchemaContentBodyItem<KoriSchemaBase>;

/**
 * Base content body mapping accepting any media type definitions.
 */
export type KoriRequestSchemaContentBodyMappingBase = Record<string, KoriRequestSchemaContentBodyItemBase>;

/**
 * Request body schema with explicit content type specification.
 *
 * Use this when you need to specify content types explicitly or handle multiple media types.
 * For simple application/json bodies, use KoriRequestSchemaSimpleBody instead.
 *
 * @template BodyMapping - Record mapping media types to value definitions
 *
 * @example
 * ```typescript
 * {
 *   content: {
 *     'application/x-www-form-urlencoded': contactFormSchema
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * {
 *   description: 'Contact form submission',
 *   content: {
 *     'application/x-www-form-urlencoded': {
 *       schema: contactFormSchema,
 *       examples: {
 *         sample: { company: 'Acme Inc', email: 'contact@acme.com' }
 *       }
 *     }
 *   }
 * }
 * ```
 */
export type KoriRequestSchemaContentBody<BodyMapping extends KoriRequestSchemaContentBodyMappingBase> = {
  description?: string;
  content: BodyMapping;
};

/**
 * Base request body accepting any content type mapping definitions.
 */
export type KoriRequestSchemaContentBodyBase = KoriRequestSchemaContentBody<KoriRequestSchemaContentBodyMappingBase>;

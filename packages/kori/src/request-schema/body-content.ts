import { type KoriSchemaBase } from '../schema/index.js';

/**
 * Request body schema with explicit content type specification.
 *
 * Use this when you need to specify content types explicitly or handle multiple media types.
 * For simple application/json bodies, pass the schema directly to the body option.
 *
 * @template BodyMapping - Record mapping media types to value definitions
 *
 * @example
 * ```typescript
 * {
 *   description: 'Contact form submission',
 *   content: {
 *     'application/x-www-form-urlencoded': contactFormSchema
 *   }
 * }
 * ```
 */
export type KoriRequestSchemaContentBody<BodyMapping extends Record<string, KoriSchemaBase>> = {
  description?: string;
  content: BodyMapping;
};

/**
 * Base request body accepting any content type mapping definitions.
 */
export type KoriRequestSchemaContentBodyBase = KoriRequestSchemaContentBody<Record<string, KoriSchemaBase>>;

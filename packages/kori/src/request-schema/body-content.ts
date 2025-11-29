import { type KoriSchemaBase } from '../schema/index.js';

/**
 * Parse type for request body content.
 *
 * Specifies how to parse the raw request body:
 * - json: Parse as JSON
 * - form: Parse as form data (url-encoded or multipart)
 * - text: Parse as plain text
 * - binary: Parse as binary (ArrayBuffer)
 * - auto: Automatically detect from media type (default)
 */
export type KoriRequestBodyParseType = 'json' | 'form' | 'text' | 'binary' | 'auto';

/**
 * Content entry for request body schema.
 *
 * Can be either a direct schema (for automatic parse type detection)
 * or an object with explicit schema and parse type specification.
 *
 * @template Schema - The schema type for validation
 */
export type KoriRequestSchemaContentEntry<Schema extends KoriSchemaBase> =
  | Schema
  | {
      schema: Schema;
      parseType?: KoriRequestBodyParseType;
    };

/**
 * Base content entry accepting any schema type.
 */
export type KoriRequestSchemaContentEntryBase = KoriRequestSchemaContentEntry<KoriSchemaBase>;

/**
 * Request body schema with explicit content type specification.
 *
 * Use this when you need to specify content types explicitly or handle multiple media types.
 * For simple application/json bodies, pass the schema directly to the body option.
 *
 * @template BodyMapping - Record mapping media types to schema definitions
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
 *
 * @example
 * ```typescript
 * {
 *   description: 'Custom binary format',
 *   content: {
 *     'application/vnd.myapp+cbor': {
 *       schema: cborSchema,
 *       parseType: 'binary'
 *     }
 *   }
 * }
 * ```
 */
export type KoriRequestSchemaContentBody<BodyMapping extends Record<string, KoriSchemaBase>> = {
  description?: string;
  content: {
    [K in keyof BodyMapping]: KoriRequestSchemaContentEntry<BodyMapping[K]>;
  };
};

/**
 * Base request body accepting any content type mapping definitions.
 */
export type KoriRequestSchemaContentBodyBase = KoriRequestSchemaContentBody<Record<string, KoriSchemaBase>>;

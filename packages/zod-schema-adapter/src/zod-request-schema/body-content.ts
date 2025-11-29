import { type KoriRequestBodyParseType } from '@korix/kori';
import { type z } from 'zod';

/**
 * Content entry for Zod request body schema.
 *
 * Can be either a direct Zod schema (for automatic parse type detection)
 * or an object with explicit schema and parse type specification.
 *
 * @template Schema - The Zod schema type
 */
export type KoriZodRequestSchemaContentEntry<Schema extends z.ZodType> =
  | Schema
  | {
      schema: Schema;
      parseType?: KoriRequestBodyParseType;
    };

/**
 * Request body schema with content-type mapping, allowing different schemas
 * for different media types (e.g., application/json, multipart/form-data).
 *
 * @template ZBodyMapping - Mapping of content types to their schemas
 */
export type KoriZodRequestSchemaContentBody<ZBodyMapping extends Record<string, z.ZodType>> = {
  description?: string;
  content: {
    [K in keyof ZBodyMapping]: KoriZodRequestSchemaContentEntry<ZBodyMapping[K]>;
  };
};

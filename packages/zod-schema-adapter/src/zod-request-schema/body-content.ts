import { type z } from 'zod';

/**
 * Request body item schema with content-type mapping, allowing different schemas
 * for different media types (e.g., application/json, multipart/form-data).
 *
 * @template Z - Zod schema type for body validation
 */
export type KoriZodRequestSchemaContentBodyItem<Z extends z.ZodType> =
  | Z
  | {
      schema: Z;
      examples?: Record<string, unknown>;
    };

/**
 * Base content body item accepting any Zod schema.
 */
export type KoriZodRequestSchemaContentBodyItemBase = KoriZodRequestSchemaContentBodyItem<z.ZodType>;

/**
 * Base content body mapping accepting any Zod schema.
 */
export type KoriZodRequestSchemaContentBodyMappingBase = Record<string, KoriZodRequestSchemaContentBodyItemBase>;

/**
 * Request body schema with content-type mapping, allowing different schemas
 * for different media types (e.g., application/json, multipart/form-data).
 *
 * @template ZBodyMapping - Mapping of content types to their schemas
 */
export type KoriZodRequestSchemaContentBody<ZBodyMapping extends KoriZodRequestSchemaContentBodyMappingBase> = {
  description?: string;
  content: ZBodyMapping;
};

import { type z } from 'zod';

/**
 * Content entry item that accepts either a Zod schema directly or an object with schema and examples.
 *
 * @template Z - Zod schema type for the content
 */
export type KoriZodResponseSchemaContentEntryItem<Z extends z.ZodType> =
  | Z
  | {
      schema: Z;
      examples?: Record<string, unknown>;
    };

/**
 * Base type for response content entry items using any Zod type.
 */
export type KoriZodResponseSchemaContentEntryItemBase = KoriZodResponseSchemaContentEntryItem<z.ZodType>;

/**
 * Mapping of media types to response content entry items.
 */
export type KoriZodResponseSchemaContentEntryMappingBase = Record<string, KoriZodResponseSchemaContentEntryItemBase>;

/**
 * Response schema content entry with content mapping for different media types.
 *
 * @template ZHeaders - Zod schema type for response headers
 * @template ZContentMapping - Content mapping for different media types
 */
export type KoriZodResponseSchemaContentEntry<
  ZHeaders extends z.ZodType,
  ZContentMapping extends KoriZodResponseSchemaContentEntryMappingBase,
> = {
  description?: string;
  headers?: ZHeaders;
  content: ZContentMapping;
  links?: Record<string, unknown>;
};

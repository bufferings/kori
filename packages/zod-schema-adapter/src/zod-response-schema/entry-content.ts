import { type z } from 'zod';

/**
 * Response schema content entry with content mapping for different media types.
 *
 * @template ZHeaders - Zod schema type for response headers
 * @template ZContentMapping - Content mapping for different media types
 */
export type KoriZodResponseSchemaContentEntry<
  ZHeaders extends z.ZodType,
  ZContentMapping extends Record<string, z.ZodType>,
> = {
  description?: string;
  headers?: ZHeaders;
  content: ZContentMapping;
};

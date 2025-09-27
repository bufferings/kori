import { type z } from 'zod';

/**
 * Response schema entry that accepts either a Zod schema directly or an object with schema and metadata.
 *
 * @template ZHeaders - Zod schema type for response headers
 * @template Z - Zod schema type for response body
 */
export type KoriZodResponseSchemaSimpleEntry<ZHeaders extends z.ZodType, Z extends z.ZodType> =
  | Z
  | {
      description?: string;
      headers?: ZHeaders;
      schema: Z;
      examples?: Record<string, unknown>;
      links?: Record<string, unknown>;
    };

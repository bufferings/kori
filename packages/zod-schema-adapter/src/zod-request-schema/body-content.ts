import { type z } from 'zod';

/**
 * Request body schema with content-type mapping, allowing different schemas
 * for different media types (e.g., application/json, multipart/form-data).
 *
 * @template ZBodyMapping - Mapping of content types to their schemas
 */
export type KoriZodRequestSchemaContentBody<ZBodyMapping extends Record<string, z.ZodType>> = {
  description?: string;
  content: ZBodyMapping;
};

import { type StandardSchemaV1 } from '@standard-schema/spec';

/**
 * Response schema content entry with content mapping for different media types.
 *
 * @template StdHeaders - Standard Schema type for response headers
 * @template StdContentMapping - Content mapping for different media types
 */
export type KoriStdResponseSchemaContentEntry<
  StdHeaders extends StandardSchemaV1,
  StdContentMapping extends Record<string, StandardSchemaV1>,
> = {
  description?: string;
  headers?: StdHeaders;
  content: StdContentMapping;
};

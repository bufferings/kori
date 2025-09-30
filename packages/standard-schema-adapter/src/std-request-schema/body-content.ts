import { type StandardSchemaV1 } from '@standard-schema/spec';

/**
 * Request body schema with content-type mapping, allowing different schemas
 * for different media types (e.g., application/json, multipart/form-data).
 *
 * @template StdBodyMapping - Mapping of content types to their schemas
 */
export type KoriStdRequestSchemaContentBody<StdBodyMapping extends Record<string, StandardSchemaV1>> = {
  description?: string;
  content: StdBodyMapping;
};

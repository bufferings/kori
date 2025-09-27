import { type StandardSchemaV1 } from '@standard-schema/spec';

/**
 * Request body item schema with content-type mapping, allowing different schemas
 * for different media types (e.g., application/json, multipart/form-data).
 *
 * @template S - Standard Schema type for body validation
 */
export type KoriStdRequestSchemaContentBodyItem<S extends StandardSchemaV1> =
  | S
  | {
      schema: S;
      examples?: Record<string, unknown>;
    };

/**
 * Base content body item accepting any Standard Schema.
 */
export type KoriStdRequestSchemaContentBodyItemBase = KoriStdRequestSchemaContentBodyItem<StandardSchemaV1>;

/**
 * Base content body mapping accepting any Standard Schema.
 */
export type KoriStdRequestSchemaContentBodyMappingBase = Record<string, KoriStdRequestSchemaContentBodyItemBase>;

/**
 * Request body schema with content-type mapping, allowing different schemas
 * for different media types (e.g., application/json, multipart/form-data).
 *
 * @template StdBodyMapping - Mapping of content types to their schemas
 */
export type KoriStdRequestSchemaContentBody<StdBodyMapping extends KoriStdRequestSchemaContentBodyMappingBase> = {
  description?: string;
  content: StdBodyMapping;
};

import { type StandardSchemaV1 } from '@standard-schema/spec';

/**
 * Response schema entry that accepts either a Standard Schema directly or an object with schema and metadata.
 *
 * @template StdHeaders - Standard Schema type for response headers
 * @template S - Standard Schema type for response body
 */
export type KoriStdResponseSchemaSimpleEntry<StdHeaders extends StandardSchemaV1, S extends StandardSchemaV1> =
  | S
  | {
      description?: string;
      headers?: StdHeaders;
      schema: S;
      examples?: Record<string, unknown>;
      links?: Record<string, unknown>;
    };

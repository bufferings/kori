import { type KoriRequestBodyParseType } from '@korix/kori';
import { type StandardSchemaV1 } from '@standard-schema/spec';

/**
 * Content entry for Standard Schema request body schema.
 *
 * Can be either a direct Standard Schema (for automatic parse type detection)
 * or an object with explicit schema and parse type specification.
 *
 * @template Schema - The Standard Schema type
 */
export type KoriStdRequestSchemaContentEntry<Schema extends StandardSchemaV1> =
  | Schema
  | {
      schema: Schema;
      parseType?: KoriRequestBodyParseType;
    };

/**
 * Request body schema with content-type mapping, allowing different schemas
 * for different media types (e.g., application/json, multipart/form-data).
 *
 * @template StdBodyMapping - Mapping of content types to their schemas
 */
export type KoriStdRequestSchemaContentBody<StdBodyMapping extends Record<string, StandardSchemaV1>> = {
  description?: string;
  content: {
    [K in keyof StdBodyMapping]: KoriStdRequestSchemaContentEntry<StdBodyMapping[K]>;
  };
};

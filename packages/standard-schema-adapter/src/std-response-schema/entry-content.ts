import { type StandardSchemaV1 } from '@standard-schema/spec';

/**
 * Content entry item that accepts either a Standard Schema directly or an object with schema and examples.
 *
 * @template S - Standard Schema type for the content
 */
export type KoriStdResponseSchemaContentEntryItem<S extends StandardSchemaV1> =
  | S
  | {
      schema: S;
      examples?: Record<string, unknown>;
    };

/**
 * Base type for response content entry items using any Standard Schema type.
 */
export type KoriStdResponseSchemaContentEntryItemBase = KoriStdResponseSchemaContentEntryItem<StandardSchemaV1>;

/**
 * Mapping of media types to response content entry items.
 */
export type KoriStdResponseSchemaContentEntryMappingBase = Record<string, KoriStdResponseSchemaContentEntryItemBase>;

/**
 * Response schema content entry with content mapping for different media types.
 *
 * @template StdHeaders - Standard Schema type for response headers
 * @template StdContentMapping - Content mapping for different media types
 */
export type KoriStdResponseSchemaContentEntry<
  StdHeaders extends StandardSchemaV1,
  StdContentMapping extends KoriStdResponseSchemaContentEntryMappingBase,
> = {
  description?: string;
  headers?: StdHeaders;
  content: StdContentMapping;
  links?: Record<string, unknown>;
};

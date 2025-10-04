import { type KoriSchemaBase } from '@korix/kori';
import { type SchemaObject } from 'openapi3-ts/oas31';

/**
 * Function type for converting Kori schemas to OpenAPI schema objects.
 *
 * @param schema - Kori schema to convert
 * @returns OpenAPI SchemaObject, or undefined if conversion fails
 */
export type ConvertSchemaFn = ({ schema }: { schema: KoriSchemaBase }) => SchemaObject | undefined;

/**
 * Schema converter interface for extending OpenAPI document generation.
 *
 * Converters allow the OpenAPI plugin to handle different schema types
 * (e.g., Zod, JSON Schema, custom validators) by providing conversion
 * logic to OpenAPI schema format.
 *
 * @example
 * ```typescript
 * const myConverter: SchemaConverter = {
 *   name: 'my-schema-converter',
 *   canConvert: ({ schema }) => {
 *     return schema.provider === 'my-provider';
 *   },
 *   convert: ({ schema }) => {
 *     return { type: 'string' };
 *   }
 * };
 * ```
 */
export type SchemaConverter = {
  /** Unique name identifying this converter */
  name: string;
  /** Determines if this converter can handle the given schema */
  canConvert: ({ schema }: { schema: KoriSchemaBase }) => boolean;
  /** Converts the schema to OpenAPI format */
  convert: ConvertSchemaFn;
};

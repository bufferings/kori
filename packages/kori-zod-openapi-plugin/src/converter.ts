import { type KoriSchemaDefault, isKoriSchema } from 'kori';
import { type SchemaConverter, type ConversionContext } from 'kori-openapi-plugin';
import { type KoriZodSchema } from 'kori-zod-schema';
import { type SchemaObject } from 'openapi3-ts/oas31';
import { z } from 'zod/v4';

/**
 * Check if a schema is a Kori Zod schema
 */
function isKoriZodSchema(schema: KoriSchemaDefault): schema is KoriZodSchema<z.ZodType> {
  return isKoriSchema(schema) && 'def' in schema && typeof schema.def === 'object' && schema.def !== null;
}

/**
 * Create a Zod schema converter for OpenAPI
 */
export function createZodSchemaConverter(): SchemaConverter {
  return {
    name: 'zod-converter',
    canConvert: (schema: KoriSchemaDefault): boolean => {
      return isKoriZodSchema(schema);
    },
    convert: (schema: KoriSchemaDefault, _context: ConversionContext): SchemaObject => {
      if (!isKoriZodSchema(schema)) {
        throw new Error('Schema is not a valid Kori Zod schema');
      }

      try {
        return z.toJSONSchema(schema.def) as SchemaObject;
      } catch {
        // Fallback to generic object schema
        return { type: 'object' };
      }
    },
  };
}

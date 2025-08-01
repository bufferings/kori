import { type KoriSchemaDefault } from '@korix/kori';
import { type SchemaConverter, type ConversionContext } from '@korix/openapi-plugin';
import { isKoriZodSchema } from '@korix/zod-schema';
import { type SchemaObject } from 'openapi3-ts/oas31';
import { z } from 'zod';

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

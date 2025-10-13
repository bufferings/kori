import { type KoriSchemaBase } from '@korix/kori';
import { type SchemaConverter } from '@korix/openapi-plugin';
import { type SchemaObject } from 'openapi3-ts/oas31';
import { z } from 'zod';

export function isZodType(value: unknown): value is z.ZodType {
  return value instanceof z.ZodType;
}

/**
 * Create a Zod schema converter for OpenAPI
 */
export function createZodSchemaConverter(): SchemaConverter {
  return {
    name: 'zod-converter',
    canConvert: ({ schema }: { schema: KoriSchemaBase }): boolean => {
      return isZodType(schema.definition);
    },
    convert: ({ schema }: { schema: KoriSchemaBase }): SchemaObject | undefined => {
      if (!isZodType(schema.definition)) {
        throw new Error('Schema is not a valid Kori Zod schema');
      }

      try {
        return z.toJSONSchema(schema.definition, { target: 'draft-2020-12' }) as SchemaObject;
      } catch {
        return;
      }
    },
  };
}

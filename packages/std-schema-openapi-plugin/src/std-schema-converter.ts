import { type KoriSchemaBase } from '@korix/kori';
import { type SchemaConverter } from '@korix/openapi-plugin';
import { type StandardJSONSchemaV1 } from '@standard-schema/spec';
import { type SchemaObject } from 'openapi3-ts/oas31';

export function isStandardJsonSchema(value: unknown): value is StandardJSONSchemaV1 {
  return (
    value != null &&
    typeof value === 'object' &&
    '~standard' in value &&
    value['~standard'] != null &&
    typeof value['~standard'] === 'object' &&
    'jsonSchema' in value['~standard'] &&
    value['~standard'].jsonSchema != null
  );
}

/**
 * Create a Standard JSON Schema converter for OpenAPI
 */
export function createStdSchemaConverter(): SchemaConverter {
  return {
    name: 'std-schema-converter',
    canConvert: ({ schema }: { schema: KoriSchemaBase }): boolean => {
      return isStandardJsonSchema(schema.definition);
    },
    convert: ({ schema }: { schema: KoriSchemaBase }): SchemaObject | undefined => {
      if (!isStandardJsonSchema(schema.definition)) {
        throw new Error('Schema is not a valid Standard JSON Schema');
      }

      try {
        return schema.definition['~standard'].jsonSchema.output({ target: 'draft-2020-12' }) as SchemaObject;
      } catch {
        return;
      }
    },
  };
}

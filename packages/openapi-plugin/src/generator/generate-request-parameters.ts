import { type KoriRequestSchemaBase } from '@korix/kori';
import { type ParameterObject, type SchemaObject } from 'openapi3-ts/oas31';

import { type ConvertSchemaFn } from '../schema-converter/index.js';

/**
 * Converts a SchemaObject to a ParameterObject.
 *
 * Copies metadata (description, example, examples, deprecated) from the SchemaObject
 * to the Parameter level, following OpenAPI specification recommendations.
 *
 * @internal
 */
function createParameterObject({
  name,
  schemaObject,
  parameterIn,
  required,
}: {
  name: string;
  schemaObject: SchemaObject;
  parameterIn: 'path' | 'query' | 'header';
  required: boolean;
}): ParameterObject {
  const parameter: ParameterObject = {
    name,
    in: parameterIn,
    required,
    schema: schemaObject,
  };

  if (schemaObject.description !== undefined) {
    parameter.description = schemaObject.description;
  }
  if (schemaObject.example !== undefined) {
    parameter.example = schemaObject.example as unknown;
  }
  if (schemaObject.examples !== undefined) {
    parameter.examples = schemaObject.examples as unknown as ParameterObject['examples'];
  }
  if (schemaObject.deprecated !== undefined) {
    parameter.deprecated = schemaObject.deprecated;
  }

  return parameter;
}

/**
 * Generates multiple ParameterObjects from SchemaObject properties.
 *
 * @internal
 */
function createParametersFromProperties({
  schemaObject,
  parameterIn,
}: {
  schemaObject: SchemaObject | undefined;
  parameterIn: 'path' | 'query' | 'header';
}): ParameterObject[] {
  if (!schemaObject?.properties) {
    return [];
  }

  const parameters: ParameterObject[] = [];
  for (const [name, propertySchema] of Object.entries(schemaObject.properties)) {
    parameters.push(
      createParameterObject({
        name,
        schemaObject: propertySchema as SchemaObject,
        parameterIn,
        required: schemaObject.required?.includes(name) ?? false,
      }),
    );
  }
  return parameters;
}

/**
 * @internal
 */
export function generateRequestParameters({
  schema,
  convertSchema,
}: {
  schema: KoriRequestSchemaBase | undefined;
  convertSchema: ConvertSchemaFn;
}): ParameterObject[] {
  const parameters: ParameterObject[] = [];

  if (!schema) {
    return parameters;
  }

  if (schema.params) {
    parameters.push(
      ...createParametersFromProperties({
        schemaObject: convertSchema({ schema: schema.params }),
        parameterIn: 'path',
      }),
    );
  }

  if (schema.queries) {
    parameters.push(
      ...createParametersFromProperties({
        schemaObject: convertSchema({ schema: schema.queries }),
        parameterIn: 'query',
      }),
    );
  }

  if (schema.headers) {
    parameters.push(
      ...createParametersFromProperties({
        schemaObject: convertSchema({ schema: schema.headers }),
        parameterIn: 'header',
      }),
    );
  }

  return parameters;
}

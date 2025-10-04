import { type KoriLogger, type KoriRequestSchemaBase } from '@korix/kori';
import { type ParameterObject, type SchemaObject } from 'openapi3-ts/oas31';

import { type ConvertSchemaFn } from '../schema-converter/index.js';

/**
 * Extracts path parameter names from an OpenAPI path pattern.
 *
 * @param path - OpenAPI path pattern (e.g., "/users/{id}/posts/{postId}")
 * @returns Array of parameter names (e.g., ["id", "postId"])
 */
function extractPathParameterNames(path: string): string[] {
  const paramNames: string[] = [];
  for (const segment of path.split('/')) {
    if (segment.startsWith('{') && segment.endsWith('}')) {
      const paramName = segment.slice(1, -1);
      paramNames.push(paramName);
    }
  }
  return paramNames;
}

/**
 * Converts a SchemaObject to a ParameterObject.
 *
 * Copies metadata (description, example, examples, deprecated) from the SchemaObject
 * to the Parameter level, following OpenAPI specification recommendations.
 *
 * @param name - Parameter name
 * @param schemaObject - OpenAPI schema object for the parameter
 * @param parameterIn - Location of the parameter (path, query, or header)
 * @param required - Whether the parameter is required
 * @returns OpenAPI ParameterObject
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
 * Each property in the schema becomes a separate parameter. The required
 * status is determined from the schema's required array.
 *
 * @param schemaObject - OpenAPI schema object with properties to convert
 * @param parameterIn - Location where all parameters will be placed
 * @returns Array of OpenAPI ParameterObjects, empty if no properties exist
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
 * Generates OpenAPI ParameterObjects from Kori request schema and path pattern.
 *
 * Extracts parameters from four sources:
 * - Path parameters (from OpenAPI path pattern, enriched by schema.params if available)
 * - Query parameters (from schema.queries)
 * - Header parameters (from schema.headers)
 *
 * Path parameters are automatically generated from the path pattern. If a params schema
 * is provided, it enriches the path parameters with additional details (description,
 * type constraints, etc.). Schema properties not present in the path are ignored with a warning.
 *
 * @param path - OpenAPI path pattern (e.g., "/users/{id}")
 * @param schema - Kori request schema containing parameter definitions
 * @param convertSchema - Function to convert Kori schema to OpenAPI schema
 * @param log - Logger
 * @returns Array of OpenAPI ParameterObjects for all request parameters
 *
 * @internal
 */
export function generateRequestParameters({
  path,
  schema,
  convertSchema,
  log,
}: {
  path: string;
  schema: KoriRequestSchemaBase | undefined;
  convertSchema: ConvertSchemaFn;
  log: KoriLogger;
}): ParameterObject[] {
  const parameters: ParameterObject[] = [];

  let paramsSchemaObject: SchemaObject | undefined;
  if (schema?.params) {
    const converted = convertSchema({ schema: schema.params });
    if (!converted) {
      log.warn('Failed to convert params schema', {
        provider: schema.params.provider,
      });
    } else {
      paramsSchemaObject = converted;
    }
  }

  const pathParamNames = extractPathParameterNames(path);
  if (pathParamNames.length === 0) {
    if (paramsSchemaObject) {
      log.warn('Params schema provided but path has no parameters', {
        path,
      });
    }
  } else {
    for (const paramName of pathParamNames) {
      const propertySchema = paramsSchemaObject?.properties?.[paramName] as SchemaObject | undefined;

      parameters.push(
        createParameterObject({
          name: paramName,
          schemaObject: propertySchema ?? { type: 'string' },
          parameterIn: 'path',
          required: true,
        }),
      );
    }

    // Warn about schema properties not in path
    if (paramsSchemaObject?.properties) {
      for (const propName of Object.keys(paramsSchemaObject.properties)) {
        if (!pathParamNames.includes(propName)) {
          log.warn('Params schema property not found in path', {
            property: propName,
            path,
          });
        }
      }
    }
  }

  if (schema?.queries) {
    const queriesSchemaObject = convertSchema({ schema: schema.queries });
    if (!queriesSchemaObject) {
      log.warn('Failed to convert queries schema', {
        provider: schema.queries.provider,
      });
    }
    parameters.push(
      ...createParametersFromProperties({
        schemaObject: queriesSchemaObject,
        parameterIn: 'query',
      }),
    );
  }

  if (schema?.headers) {
    const headersSchemaObject = convertSchema({ schema: schema.headers });
    if (!headersSchemaObject) {
      log.warn('Failed to convert headers schema', {
        provider: schema.headers.provider,
      });
    }
    parameters.push(
      ...createParametersFromProperties({
        schemaObject: headersSchemaObject,
        parameterIn: 'header',
      }),
    );
  }

  return parameters;
}

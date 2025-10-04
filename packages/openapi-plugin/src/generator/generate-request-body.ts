import { isKoriSchema, MediaType, type KoriLogger, type KoriRequestSchemaBase } from '@korix/kori';
import { type RequestBodyObject, type SchemaObject, type MediaTypeObject } from 'openapi3-ts/oas31';

import { type ConvertSchemaFn } from '../schema-converter/index.js';

/**
 * Creates a MediaTypeObject from a SchemaObject, copying metadata to the MediaType level.
 *
 * Copies example and examples from the SchemaObject to the MediaType level,
 * following OpenAPI specification recommendations.
 *
 * @param schemaObject - OpenAPI schema object to convert
 * @returns OpenAPI MediaTypeObject with schema and optional examples
 */
function createMediaTypeObject({ schemaObject }: { schemaObject: SchemaObject }): MediaTypeObject {
  const mediaType: MediaTypeObject = {
    schema: schemaObject,
  };

  if (schemaObject.example !== undefined) {
    mediaType.example = schemaObject.example as unknown;
  }
  if (schemaObject.examples !== undefined) {
    mediaType.examples = schemaObject.examples as unknown as MediaTypeObject['examples'];
  }

  return mediaType;
}

/**
 * Generates OpenAPI RequestBodyObject from Kori request schema.
 *
 * Handles two cases:
 * - Simple body: Single schema converted to application/json
 * - Content body: Multiple schemas with specific media types
 *
 * @param schema - Kori request schema containing body definition
 * @param convertSchema - Function to convert Kori schema to OpenAPI schema
 * @param log - Logger
 * @returns OpenAPI RequestBodyObject, or undefined if no body schema or all conversions fail
 *
 * @internal
 */
export function generateRequestBody({
  schema,
  convertSchema,
  log,
}: {
  schema: KoriRequestSchemaBase | undefined;
  convertSchema: ConvertSchemaFn;
  log: KoriLogger;
}): RequestBodyObject | undefined {
  if (!schema?.body) {
    return;
  }

  if (isKoriSchema(schema.body)) {
    // simple body
    const schemaObject = convertSchema({ schema: schema.body });
    if (!schemaObject) {
      log.warn('Failed to convert body schema', {
        provider: schema.body.provider,
      });
      return;
    }

    return {
      content: {
        [MediaType.APPLICATION_JSON]: createMediaTypeObject({ schemaObject }),
      },
      required: true,
    };
  }

  // content body
  const content: Record<string, MediaTypeObject> = {};
  for (const [mediaType, bodySchema] of Object.entries(schema.body.content)) {
    const schemaObject = convertSchema({ schema: bodySchema });
    if (schemaObject) {
      content[mediaType] = createMediaTypeObject({ schemaObject });
    }
  }

  if (Object.keys(content).length === 0) {
    log.warn('Failed to convert all media types for request body', {
      description: schema.body.description,
      mediaTypes: Object.keys(schema.body.content),
    });
    return;
  }

  return {
    description: schema.body.description,
    content,
    required: true,
  };
}

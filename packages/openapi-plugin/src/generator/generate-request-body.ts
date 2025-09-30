import { isKoriSchema, type KoriRequestSchemaBase } from '@korix/kori';
import { type RequestBodyObject, type SchemaObject, type MediaTypeObject } from 'openapi3-ts/oas31';

import { type ConvertSchemaFn } from '../schema-converter/index.js';

/**
 * Creates a MediaTypeObject from a SchemaObject, copying metadata to the MediaType level.
 *
 * Copies example and examples from the SchemaObject to the MediaType level,
 * following OpenAPI specification recommendations.
 *
 * @internal
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

export function generateRequestBody({
  schema,
  convertSchema,
}: {
  schema: KoriRequestSchemaBase | undefined;
  convertSchema: ConvertSchemaFn;
}): RequestBodyObject | undefined {
  if (!schema?.body) {
    return;
  }

  if (isKoriSchema(schema.body)) {
    // simple body
    const schemaObject = convertSchema({ schema: schema.body });
    if (!schemaObject) {
      return;
    }

    return {
      content: {
        'application/json': createMediaTypeObject({ schemaObject }),
      },
      required: true,
    };
  } else {
    // content body
    const content: Record<string, MediaTypeObject> = {};
    for (const [mediaType, bodySchema] of Object.entries(schema.body.content)) {
      const schemaObject = convertSchema({ schema: bodySchema });
      if (schemaObject) {
        content[mediaType] = createMediaTypeObject({ schemaObject });
      }
    }
    return {
      description: schema.body.description,
      content,
      required: true,
    };
  }
}

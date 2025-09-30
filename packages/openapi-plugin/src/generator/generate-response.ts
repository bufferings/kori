import { isKoriSchema, type KoriResponseSchemaBase, type KoriSchemaBase } from '@korix/kori';
import {
  type ResponsesObject,
  type SchemaObject,
  type MediaTypeObject,
  type HeadersObject,
  type HeaderObject,
} from 'openapi3-ts/oas31';

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

/**
 * Generates HeadersObject from a response headers schema.
 *
 * Extracts individual header definitions from the schema properties and converts them
 * to OpenAPI HeaderObject format with metadata at the header level.
 *
 * @internal
 */
function generateResponseHeaders({
  headersSchema,
  convertSchema,
}: {
  headersSchema: KoriSchemaBase | undefined;
  convertSchema: ConvertSchemaFn;
}): HeadersObject | undefined {
  if (!headersSchema) {
    return;
  }

  const schemaObject = convertSchema({ schema: headersSchema });
  if (!schemaObject?.properties) {
    return;
  }

  const headers: HeadersObject = {};
  for (const [name, headerSchemaObj] of Object.entries(schemaObject.properties)) {
    const headerSchema = headerSchemaObj as SchemaObject;
    const headerObject: HeaderObject = {
      required: schemaObject.required?.includes(name) ?? false,
      schema: headerSchema,
    };

    if (headerSchema.description !== undefined) {
      headerObject.description = headerSchema.description;
    }
    if (headerSchema.example !== undefined) {
      headerObject.example = headerSchema.example as unknown;
    }
    if (headerSchema.examples !== undefined) {
      headerObject.examples = headerSchema.examples as unknown as HeaderObject['examples'];
    }
    if (headerSchema.deprecated !== undefined) {
      headerObject.deprecated = headerSchema.deprecated;
    }

    headers[name] = headerObject;
  }

  return headers;
}

export function generateResponses({
  schema,
  convertSchema,
}: {
  schema: KoriResponseSchemaBase | undefined;
  convertSchema: ConvertSchemaFn;
}): ResponsesObject | undefined {
  if (!schema) {
    return;
  }

  const responses: ResponsesObject = {};
  for (const [statusCode, entry] of Object.entries(schema.responses ?? {})) {
    if (!entry) {
      continue;
    }

    // Simple entry: direct schema
    if (isKoriSchema(entry)) {
      const schemaObject = convertSchema({ schema: entry });
      if (!schemaObject) {
        continue;
      }

      responses[statusCode] = {
        description: getStatusDescription(statusCode),
        content: {
          'application/json': createMediaTypeObject({ schemaObject }),
        },
      };
      continue;
    }

    // Content entry
    const content: Record<string, MediaTypeObject> = {};
    for (const [mediaType, bodySchema] of Object.entries(entry.content)) {
      const schemaObject = convertSchema({ schema: bodySchema });
      if (schemaObject) {
        content[mediaType] = createMediaTypeObject({ schemaObject });
      }
    }

    responses[statusCode] = {
      description: entry.description ?? getStatusDescription(statusCode),
      headers: generateResponseHeaders({ headersSchema: entry.headers, convertSchema }),
      content,
    };
  }

  return responses;
}

function getStatusDescription(statusCode: string): string {
  const descriptions: Record<string, string> = {
    '200': 'OK',
    '201': 'Created',
    '204': 'No Content',
    '400': 'Bad Request',
    '401': 'Unauthorized',
    '403': 'Forbidden',
    '404': 'Not Found',
    '500': 'Internal Server Error',
  };
  return descriptions[statusCode] ?? 'Response';
}

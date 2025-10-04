import { isKoriSchema, type KoriLogger, type KoriResponseSchemaBase, type KoriSchemaBase } from '@korix/kori';
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
 * Generates HeadersObject from a response headers schema.
 *
 * Extracts individual header definitions from the schema properties and converts them
 * to OpenAPI HeaderObject format with metadata at the header level.
 *
 * @param headersSchema - Kori schema for response headers
 * @param convertSchema - Function to convert Kori schema to OpenAPI schema
 * @param log - Logger
 * @returns OpenAPI HeadersObject, or undefined if no headers or conversion fails
 */
function generateResponseHeaders({
  headersSchema,
  convertSchema,
  log,
}: {
  headersSchema: KoriSchemaBase | undefined;
  convertSchema: ConvertSchemaFn;
  log: KoriLogger;
}): HeadersObject | undefined {
  if (!headersSchema) {
    return;
  }

  const schemaObject = convertSchema({ schema: headersSchema });
  if (!schemaObject?.properties) {
    if (!schemaObject) {
      log.warn('Failed to convert response headers schema', {
        provider: headersSchema.provider,
      });
    }
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

/**
 * Gets a default description for a given HTTP status code.
 *
 * Returns standard descriptions for common status codes (200, 201, 204, 400, 401, 403, 404, 500).
 * Falls back to "Response" for unknown status codes.
 *
 * @param statusCode - HTTP status code as a string
 * @returns Default description for the status code
 */
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

/**
 * Generates OpenAPI ResponsesObject from Kori response schema.
 *
 * Handles two response formats:
 * - Simple response: Direct schema converted to application/json
 * - Content response: Multiple schemas with specific media types and headers
 *
 * @param schema - Kori response schema containing response definitions by status code
 * @param convertSchema - Function to convert Kori schema to OpenAPI schema
 * @param log - Logger
 * @returns OpenAPI ResponsesObject mapping status codes to response definitions
 *
 * @internal
 */
export function generateResponses({
  schema,
  convertSchema,
  log,
}: {
  schema: KoriResponseSchemaBase | undefined;
  convertSchema: ConvertSchemaFn;
  log: KoriLogger;
}): ResponsesObject | undefined {
  if (!schema?.responses) {
    return;
  }

  const responses: ResponsesObject = {};
  for (const [statusCode, entry] of Object.entries(schema.responses)) {
    if (!entry) {
      continue;
    }

    // Simple entry
    if (isKoriSchema(entry)) {
      const schemaObject = convertSchema({ schema: entry });
      if (!schemaObject) {
        log.warn('Failed to convert response schema', {
          statusCode,
          provider: entry.provider,
        });
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

    const headers = generateResponseHeaders({ headersSchema: entry.headers, convertSchema, log });

    if (Object.keys(content).length === 0 && !headers) {
      log.warn('Failed to convert all media types for response', {
        statusCode,
        mediaTypes: Object.keys(entry.content),
      });
      continue;
    }

    responses[statusCode] = {
      description: entry.description ?? getStatusDescription(statusCode),
      headers,
      ...(Object.keys(content).length > 0 && { content }),
    };
  }

  return Object.keys(responses).length > 0 ? responses : undefined;
}

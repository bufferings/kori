import {
  type KoriRequestSchemaDefault,
  type KoriResponseSchemaDefault,
  type KoriSchemaDefault,
  isKoriSchema,
} from 'kori';
import {
  type OperationObject,
  type ParameterObject,
  type RequestBodyObject,
  type ResponsesObject,
  type SchemaObject,
} from 'openapi3-ts/oas31';

export type RouteInfo = {
  method: string;
  path: string;
  requestSchema?: KoriRequestSchemaDefault;
  responseSchema?: KoriResponseSchemaDefault;
  metadata?: {
    summary?: string;
    description?: string;
    tags?: string[];
    operationId?: string;
  };
};

export type SchemaConverter = {
  name: string;
  canConvert: (schema: KoriSchemaDefault) => boolean;
  convert: (schema: KoriSchemaDefault, context: ConversionContext) => SchemaObject;
};

export type ConversionContext = {
  components: {
    schemas: Record<string, SchemaObject>;
  };
};

export type RouteCollector = {
  addRoute: (route: RouteInfo) => void;
  addConverter: (converter: SchemaConverter) => void;
  getRoutes: () => RouteInfo[];
  clear: () => void;
  generateOperations: (context: ConversionContext) => Map<string, Map<string, OperationObject>>;
};

export function createRouteCollector(): RouteCollector {
  const routes: RouteInfo[] = [];
  const converters: SchemaConverter[] = [];

  function addRoute(route: RouteInfo): void {
    routes.push(route);
  }

  function addConverter(converter: SchemaConverter): void {
    converters.push(converter);
  }

  function getRoutes(): RouteInfo[] {
    return [...routes];
  }

  function clear(): void {
    routes.length = 0;
  }

  function generateOperations(context: ConversionContext): Map<string, Map<string, OperationObject>> {
    const operations = new Map<string, Map<string, OperationObject>>();

    for (const route of routes) {
      const pathOps = operations.get(route.path) ?? new Map<string, OperationObject>();

      const operation: OperationObject = {
        ...route.metadata,
        parameters: generateParameters(route, context),
        ...(route.requestSchema && hasBodySchema(route.requestSchema)
          ? { requestBody: generateRequestBody(route.requestSchema, context) }
          : {}),
        responses: generateResponses(route.responseSchema, context),
      };

      pathOps.set(route.method.toLowerCase(), operation);
      operations.set(route.path, pathOps);
    }

    return operations;
  }

  function generateParameters(route: RouteInfo, context: ConversionContext): ParameterObject[] {
    const parameters: ParameterObject[] = [];

    if (!route.requestSchema) return parameters;

    const schema = route.requestSchema;

    // Path parameters
    if (schema.params) {
      const paramsSchema = convertSchema(schema.params, context);
      if (paramsSchema && 'properties' in paramsSchema) {
        for (const [name, paramSchema] of Object.entries(paramsSchema.properties ?? {})) {
          parameters.push({
            name,
            in: 'path',
            required: true,
            schema: paramSchema as SchemaObject,
          });
        }
      }
    }

    // Query parameters
    if (schema.queries) {
      const querySchema = convertSchema(schema.queries, context);
      if (querySchema && 'properties' in querySchema) {
        for (const [name, paramSchema] of Object.entries(querySchema.properties ?? {})) {
          parameters.push({
            name,
            in: 'query',
            required: querySchema.required?.includes(name) ?? false,
            schema: paramSchema as SchemaObject,
          });
        }
      }
    }

    // Header parameters
    if (schema.headers) {
      const headersSchema = convertSchema(schema.headers, context);
      if (headersSchema && 'properties' in headersSchema) {
        for (const [name, paramSchema] of Object.entries(headersSchema.properties ?? {})) {
          parameters.push({
            name,
            in: 'header',
            required: headersSchema.required?.includes(name) ?? false,
            schema: paramSchema as SchemaObject,
          });
        }
      }
    }

    return parameters;
  }

  function hasBodySchema(schema: KoriRequestSchemaDefault): boolean {
    return !!schema.body;
  }

  function generateRequestBody(schema: KoriRequestSchemaDefault, context: ConversionContext): RequestBodyObject {
    if (!schema.body) {
      return {
        content: {
          'application/json': {
            schema: { type: 'object' },
          },
        },
      };
    }

    // Check if body is a simple KoriSchemaDefault
    if (isKoriSchema(schema.body)) {
      return {
        content: {
          'application/json': {
            schema: convertSchema(schema.body, context),
          },
        },
        required: true,
      };
    }

    // Handle content object format
    if (typeof schema.body === 'object' && 'content' in schema.body) {
      // This is a KoriRequestSchemaBody
      const bodyObject = schema.body as { content: unknown; description?: string; required?: boolean };
      return {
        description: bodyObject.description,
        content: {
          'application/json': {
            schema: { type: 'object' },
          },
        },
        required: bodyObject.required ?? true,
      };
    }

    // Handle other formats - treat as content object
    return {
      content: {
        'application/json': {
          schema: { type: 'object' },
        },
      },
      required: true,
    };
  }

  function generateResponses(
    schema: KoriResponseSchemaDefault | undefined,
    context: ConversionContext,
  ): ResponsesObject {
    if (!schema) {
      return {
        '200': {
          description: 'Successful response',
        },
      };
    }

    // Check if this is a response object with status codes
    if ('def' in schema && typeof schema.def === 'object' && schema.def !== null) {
      const def = schema.def as Record<string, unknown>;
      const responses: ResponsesObject = {};

      // Check if it looks like { 200: schema, 400: schema, etc }
      const isStatusCodeMap = Object.keys(def).every((key) => /^\d{3}$/.test(key));

      if (isStatusCodeMap) {
        for (const [statusCode, _responseSchema] of Object.entries(def)) {
          responses[statusCode] = {
            description: getStatusDescription(statusCode),
            content: {
              'application/json': {
                schema: { type: 'object' }, // Simplified for now
              },
            },
          };
        }
        return responses;
      }
    }

    // Default single response - check if schema can be converted directly
    if (isKoriSchema(schema)) {
      return {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: convertSchema(schema, context),
            },
          },
        },
      };
    }

    // Fallback
    return {
      '200': {
        description: 'Successful response',
      },
    };
  }

  function convertSchema(schema: KoriSchemaDefault, context: ConversionContext): SchemaObject {
    for (const converter of converters) {
      if (converter.canConvert(schema)) {
        return converter.convert(schema, context);
      }
    }

    // Fallback - simplified error handling
    return { type: 'object' };
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

  return {
    addRoute,
    addConverter,
    getRoutes,
    clear,
    generateOperations,
  };
}

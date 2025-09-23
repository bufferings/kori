import {
  type KoriRequestSchemaBase,
  type KoriResponseSchemaBase,
  type KoriSchemaBase,
  isKoriSchema,
} from '@korix/kori';
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
  requestSchema?: KoriRequestSchemaBase;
  responseSchema?: KoriResponseSchemaBase;
  metadata?: {
    summary?: string;
    description?: string;
    tags?: string[];
    operationId?: string;
  };
};

export type SchemaConverter = {
  name: string;
  canConvert: (schema: KoriSchemaBase) => boolean;
  convert: (schema: KoriSchemaBase, context: ConversionContext) => SchemaObject;
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

  function convertHonoPathToOpenApiPath(path: string): string {
    return path.replace(/:([^/]+)/g, '{$1}');
  }

  function generateOperations(context: ConversionContext): Map<string, Map<string, OperationObject>> {
    const operations = new Map<string, Map<string, OperationObject>>();

    for (const route of routes) {
      const openApiPath = convertHonoPathToOpenApiPath(route.path);
      const pathOps = operations.get(openApiPath) ?? new Map<string, OperationObject>();

      const operation: OperationObject = {
        ...route.metadata,
        parameters: generateParameters(route, context),
        ...(route.requestSchema && hasBodySchema(route.requestSchema)
          ? { requestBody: generateRequestBody(route.requestSchema, context) }
          : {}),
        responses: generateResponses(route.responseSchema, context),
      };

      pathOps.set(route.method.toLowerCase(), operation);
      operations.set(openApiPath, pathOps);
    }

    return operations;
  }

  function extractPathParameters(path: string): string[] {
    const matches = path.match(/:([^/]+)/g);
    return matches ? matches.map((match) => match.slice(1)) : [];
  }

  function generateParameters(route: RouteInfo, context: ConversionContext): ParameterObject[] {
    const parameters: ParameterObject[] = [];

    // Extract path parameters from the route path
    const pathParams = extractPathParameters(route.path);
    for (const paramName of pathParams) {
      const paramSchema: SchemaObject = { type: 'string' };

      // If requestSchema.params exists, try to get the schema for this parameter
      if (route.requestSchema?.params) {
        const paramsSchema = convertSchema(route.requestSchema.params, context);
        if (paramsSchema && 'properties' in paramsSchema && paramsSchema.properties?.[paramName]) {
          Object.assign(paramSchema, paramsSchema.properties[paramName]);
        }
      }

      parameters.push({
        name: paramName,
        in: 'path',
        required: true,
        schema: paramSchema,
      });
    }

    if (!route.requestSchema) {
      return parameters;
    }

    const schema = route.requestSchema;

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

  function hasBodySchema(schema: KoriRequestSchemaBase): boolean {
    return !!schema.body;
  }

  function generateRequestBody(schema: KoriRequestSchemaBase, context: ConversionContext): RequestBodyObject {
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
      const bodyObject = schema.body as { content: Record<string, unknown>; description?: string; required?: boolean };
      const content: Record<string, { schema: SchemaObject }> = {};
      for (const [mediaType, entry] of Object.entries(bodyObject.content)) {
        const koriSchema = isKoriSchema(entry) ? entry : (entry as { schema: unknown }).schema;
        if (isKoriSchema(koriSchema)) {
          content[mediaType] = { schema: convertSchema(koriSchema, context) };
        }
      }
      return {
        description: bodyObject.description,
        content,
        required: bodyObject.required ?? true,
      };
    }

    // Handle other formats - treat as content map
    const contentMap = schema.body as Record<string, unknown>;
    const content: Record<string, { schema: SchemaObject }> = {};
    for (const [mediaType, entry] of Object.entries(contentMap)) {
      const koriSchema = isKoriSchema(entry) ? entry : (entry as { schema: unknown }).schema;
      if (isKoriSchema(koriSchema)) {
        content[mediaType] = { schema: convertSchema(koriSchema, context) };
      }
    }
    return { content, required: true };
  }

  function generateResponses(schema: KoriResponseSchemaBase | undefined, context: ConversionContext): ResponsesObject {
    if (!schema) {
      return {
        '200': { description: 'Successful response' },
      };
    }

    // Treat schema as a statusCode -> response value map
    const responses: ResponsesObject = {};
    for (const [statusCode, value] of Object.entries(schema as Record<string, unknown>)) {
      // Single schema
      if (isKoriSchema(value)) {
        responses[statusCode] = {
          description: getStatusDescription(statusCode),
          content: {
            'application/json': { schema: convertSchema(value, context) },
          },
        };
        continue;
      }

      // Spec object with content
      const asSpec = value as { content?: Record<string, unknown>; description?: string };
      const contentSource = asSpec.content ?? (value as Record<string, unknown>);
      if (contentSource && typeof contentSource === 'object') {
        const content: Record<string, { schema: SchemaObject }> = {};
        for (const [mediaType, entry] of Object.entries(contentSource)) {
          const koriSchema = isKoriSchema(entry) ? entry : (entry as { schema: unknown }).schema;
          if (isKoriSchema(koriSchema)) {
            content[mediaType] = { schema: convertSchema(koriSchema, context) };
          }
        }
        responses[statusCode] = {
          description: asSpec.description ?? getStatusDescription(statusCode),
          content,
        };
        continue;
      }

      // Fallback
      responses[statusCode] = { description: getStatusDescription(statusCode) };
    }

    return responses;
  }

  function convertSchema(schema: KoriSchemaBase, context: ConversionContext): SchemaObject {
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

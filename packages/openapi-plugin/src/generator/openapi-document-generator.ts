import { normalizeRouteHttpMethod, type KoriLogger, type KoriRouteDefinition, type RouteHttpMethod } from '@korix/kori';
import {
  type InfoObject,
  type OpenAPIObject,
  type OperationObject,
  type PathItemObject,
  type PathsObject,
  type ServerObject,
} from 'openapi3-ts/oas31';

import { type OpenApiPluginMeta, OpenApiPluginMetaKey } from '../plugin/index.js';
import { type SchemaConverter } from '../schema-converter/index.js';

import { composeConverters } from './compose-converters.js';
import { generateRequestBody } from './generate-request-body.js';
import { generateRequestParameters } from './generate-request-parameters.js';
import { generateResponses } from './generate-response.js';

const OPENAPI_VERSION = '3.1.0';

/**
 * Converts Kori HTTP method to OpenAPI method format.
 *
 * Returns lowercase method name for standard HTTP methods, or undefined
 * for custom methods that are not supported in OpenAPI specification.
 *
 * @param koriMethod - Kori HTTP method
 * @returns OpenAPI method (lowercase), or undefined if custom method
 *
 * @internal
 */
export function toOpenApiMethod(koriMethod: RouteHttpMethod): string | undefined {
  if (typeof koriMethod === 'object') {
    return undefined;
  }
  return normalizeRouteHttpMethod(koriMethod).toLowerCase();
}

/**
 * Converts Kori path pattern to OpenAPI path format.
 *
 * Transforms path parameters from Kori's colon syntax to OpenAPI's brace syntax,
 * removing optional markers and regex constraints that are not supported in OpenAPI.
 *
 * @param koriPath - Kori path pattern (e.g., "/users/:id", "/api/:type?", "/post/:date{[0-9]+}")
 * @returns OpenAPI path format (e.g., "/users/{id}", "/api/{type}", "/post/{date}")
 *
 * @see https://github.com/rhinobase/hono-openapi/blob/2703f54d077a6de51b731a7214e9d5d83d011594/src/utils.ts#L23-L49
 *
 * @internal
 */
export function toOpenApiPath(koriPath: string): string {
  return koriPath
    .split('/')
    .map((segment) => {
      if (!segment.startsWith(':')) {
        return segment;
      }

      // Match :paramName{regex}? pattern
      const match = /^:([^{?]+)(?:\{.+\})?(\?)?$/.exec(segment);
      if (match) {
        const paramName = match[1];
        return `{${paramName}}`;
      }

      // Fallback: remove leading colon and trailing optional marker
      let paramName = segment.slice(1);
      if (paramName.endsWith('?')) {
        paramName = paramName.slice(0, -1);
      }
      return `{${paramName}}`;
    })
    .join('/');
}

/**
 * Capitalizes the first letter of a word.
 *
 * @param word - Word to capitalize
 * @returns Capitalized word
 */
function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Generates an operationId from OpenAPI path and method.
 *
 * Combines method with path segments, using "By" prefix for parameters.
 *
 * @param path - OpenAPI path pattern (e.g., "/users/{id}")
 * @param method - OpenAPI HTTP method (lowercase)
 * @returns Generated operationId (e.g., "getUsersById")
 *
 * @see https://github.com/rhinobase/hono-openapi/blob/2703f54d077a6de51b731a7214e9d5d83d011594/src/utils.ts#L54-L68
 */
function generateOperationId({ path, method }: { path: string; method: string }): string {
  let operationId = method;

  if (path === '/') {
    return `${operationId}Index`;
  }

  for (const segment of path.split('/')) {
    if (!segment) {
      continue;
    }

    if (segment.startsWith('{')) {
      const paramName = segment.slice(1, -1);
      operationId += `By${capitalize(paramName)}`;
    } else {
      operationId += capitalize(segment);
    }
  }

  return operationId;
}

/**
 * Adds an operation to the paths object at the specified path and method.
 *
 * Creates the path item if it doesn't exist, then assigns the operation
 * to the appropriate HTTP method key.
 *
 * @param paths - OpenAPI paths object to modify
 * @param path - OpenAPI path pattern
 * @param method - OpenAPI HTTP method (lowercase)
 * @param operation - OpenAPI operation object to add
 */
function addOperationToPaths({
  paths,
  path,
  method,
  operation,
}: {
  paths: PathsObject;
  path: string;
  method: string;
  operation: OperationObject;
}): void {
  paths[path] ??= {} as PathItemObject;
  const pathItem = paths[path];

  const methodKey = method as keyof PathItemObject;
  pathItem[methodKey] = operation;
}

/**
 * Generator function that produces an OpenAPI document from Kori route definitions.
 *
 * @param routeDefinitions - Kori route definitions
 * @param log - Logger
 * @returns OpenAPI document
 *
 * @packageInternal
 */
export type OpenApiDocumentGenerator = ({
  routeDefinitions,
  log,
}: {
  routeDefinitions: KoriRouteDefinition[];
  log: KoriLogger;
}) => OpenAPIObject;

/**
 * Creates an OpenAPI document generator function from route definitions.
 *
 * Returns a generator function that processes Kori route definitions and
 * converts them to an OpenAPI document.
 *
 * Routes are skipped in the following cases:
 * - Routes marked with exclude metadata
 * - Routes with custom HTTP methods (OpenAPI only supports standard methods)
 * - Routes with wildcard paths (OpenAPI does not support wildcard syntax)
 *
 * @param info - OpenAPI info object (title, version, description, etc.)
 * @param servers - Optional array of server objects (defaults to single server at "/")
 * @param converters - Array of schema converters to handle different schema types
 * @returns Generator function that accepts route definitions and produces OpenAPI document
 *
 * @packageInternal
 */
export function createOpenApiDocumentGenerator(options: {
  info: InfoObject;
  servers?: ServerObject[];
  converters: SchemaConverter[];
}): OpenApiDocumentGenerator {
  const convertSchema = composeConverters(options.converters);

  const generate: OpenApiDocumentGenerator = ({ routeDefinitions, log }) => {
    const paths: PathsObject = {};

    for (const routeDef of routeDefinitions) {
      const metadata = routeDef.pluginMeta?.[OpenApiPluginMetaKey] as OpenApiPluginMeta;
      if (metadata?.exclude) {
        continue;
      }

      const routeLog = log.child({
        name: 'route',
        bindings: {
          method: routeDef.method,
          path: routeDef.path,
        },
      });

      const openApiMethod = toOpenApiMethod(routeDef.method);
      if (!openApiMethod) {
        routeLog.info('Skipping route with custom HTTP method');
        continue;
      }

      const openApiPath = toOpenApiPath(routeDef.path);
      if (openApiPath.includes('*')) {
        routeLog.info('Skipping route with wildcard path');
        continue;
      }

      const operation: OperationObject = {
        operationId: metadata?.operationId ?? generateOperationId({ path: openApiPath, method: openApiMethod }),
        ...metadata,
        parameters: generateRequestParameters({
          path: openApiPath,
          schema: routeDef.requestSchema,
          convertSchema,
          log: routeLog,
        }),
        requestBody: generateRequestBody({ schema: routeDef.requestSchema, convertSchema, log: routeLog }),
        responses: generateResponses({ schema: routeDef.responseSchema, convertSchema, log: routeLog }),
      };

      addOperationToPaths({ paths, path: openApiPath, method: openApiMethod, operation });
    }

    return {
      openapi: OPENAPI_VERSION,
      info: options.info,
      servers: options.servers ?? [{ url: '/' }],
      paths,
    };
  };

  return generate;
}

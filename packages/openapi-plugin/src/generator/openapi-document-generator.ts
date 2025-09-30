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

function toOpenApiPath(koriPath: string): string {
  return koriPath.replace(/:([^/]+)/g, '{$1}');
}

function addOperationToPaths({
  paths,
  koriPath,
  koriMethod,
  operation,
}: {
  paths: PathsObject;
  koriPath: string;
  koriMethod: RouteHttpMethod;
  operation: OperationObject;
}): void {
  const path = toOpenApiPath(koriPath);
  paths[path] ??= {} as PathItemObject;
  const pathItem = paths[path];

  const methodKey = normalizeRouteHttpMethod(koriMethod).toLowerCase() as keyof PathItemObject;
  pathItem[methodKey] = operation;
}

/**
 * @packageInternal
 */
export function createOpenApiDocumentGenerator(options: {
  info: InfoObject;
  servers?: ServerObject[];
  converters: SchemaConverter[];
}): ({ routeDefinitions, log }: { routeDefinitions: KoriRouteDefinition[]; log: KoriLogger }) => OpenAPIObject {
  const convertSchema = composeConverters(options.converters);

  function generate({
    routeDefinitions,
    log: _,
  }: {
    routeDefinitions: KoriRouteDefinition[];
    log: KoriLogger;
  }): OpenAPIObject {
    const paths: PathsObject = {};

    for (const routeDef of routeDefinitions) {
      const metadata = routeDef.pluginMeta?.[OpenApiPluginMetaKey] as OpenApiPluginMeta;
      if (metadata?.exclude) {
        continue;
      }

      const operation: OperationObject = {
        ...metadata,
        parameters: generateRequestParameters({ schema: routeDef.requestSchema, convertSchema }),
        requestBody: generateRequestBody({ schema: routeDef.requestSchema, convertSchema }),
        responses: generateResponses({ schema: routeDef.responseSchema, convertSchema }),
      };

      addOperationToPaths({ paths, koriPath: routeDef.path, koriMethod: routeDef.method, operation });
    }

    return {
      openapi: OPENAPI_VERSION,
      info: options.info,
      servers: options.servers ?? [{ url: '/' }],
      paths,
    };
  }

  return generate;
}

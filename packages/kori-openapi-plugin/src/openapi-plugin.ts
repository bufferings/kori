import {
  defineKoriPlugin,
  type KoriRoutePluginMetadata,
  type KoriPlugin,
  type KoriResponse,
  type KoriRequest,
  type KoriEnvironment,
  getMethodString,
} from 'kori';
import {
  type OpenAPIObject,
  type InfoObject,
  type ServerObject,
  type ComponentsObject,
  type PathItemObject,
} from 'openapi3-ts/oas31';

import { createRouteCollector, type ConversionContext } from './route-collector.js';

export const OpenApiMetaSymbol = Symbol('openapi-meta');

export type OpenApiEnvironmentExtension = {
  openapi: {
    documentPath: string;
  };
};

export type OpenApiRouteMeta = {
  summary?: string;
  description?: string;
  tags?: string[];
  operationId?: string;
};

export type OpenApiOptions = {
  info: InfoObject;
  servers?: ServerObject[];
  documentPath?: string;
  excludePaths?: string[];
};

export function openApiRoute(meta: OpenApiRouteMeta): KoriRoutePluginMetadata {
  return {
    [OpenApiMetaSymbol]: meta,
  };
}

export function openApiPlugin(
  options: OpenApiOptions,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): KoriPlugin<KoriEnvironment, KoriRequest, KoriResponse, OpenApiEnvironmentExtension, unknown, unknown, any, any> {
  const documentPath = options.documentPath ?? '/openapi.json';

  const collector = createRouteCollector();
  let cachedDocument: OpenAPIObject | null = null;

  function generateDocument(): OpenAPIObject {
    if (cachedDocument) {
      return cachedDocument;
    }

    const context: ConversionContext = {
      components: {
        schemas: {},
      },
    };

    const operations = collector.generateOperations(context);
    const paths: OpenAPIObject['paths'] = {};

    for (const [path, pathOps] of operations) {
      const pathItem: PathItemObject = {};
      for (const [method, operation] of pathOps) {
        (pathItem as Record<string, unknown>)[method] = operation;
      }
      paths[path] = pathItem;
    }

    cachedDocument = {
      openapi: '3.1.0',
      info: options.info,
      servers: options.servers ?? [{ url: '/' }],
      paths,
      ...(Object.keys(context.components.schemas).length > 0
        ? { components: context.components as ComponentsObject }
        : {}),
    };

    return cachedDocument;
  }

  return defineKoriPlugin({
    name: 'openapi',
    version: '1.0.0',
    apply: (kori) => {
      // Add OpenAPI document endpoint
      kori.addRoute({
        method: 'GET',
        path: documentPath,
        handler: (ctx) => {
          const doc = generateDocument();
          return ctx.res.json(doc);
        },
      });

      return kori.onInit((ctx) => {
        // Collect route metadata from the kori instance (after all routes are registered)
        const routeDefinitions = kori.routeDefinitions();
        for (const routeDef of routeDefinitions) {
          if (routeDef.pluginMetadata?.[OpenApiMetaSymbol]) {
            const openApiMeta = routeDef.pluginMetadata[OpenApiMetaSymbol] as OpenApiRouteMeta;
            collector.addRoute({
              method: getMethodString(routeDef.method),
              path: routeDef.path,
              requestSchema: routeDef.requestSchema,
              responseSchema: routeDef.responseSchema,
              metadata: {
                summary: openApiMeta.summary,
                description: openApiMeta.description,
                tags: openApiMeta.tags,
                operationId: openApiMeta.operationId,
              },
            });
          }
        }

        return ctx.withEnv({
          openapi: {
            documentPath,
          },
        });
      });
    },
  });
}

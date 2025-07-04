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

import { createRouteCollector, type ConversionContext, type SchemaConverter } from './route-collector.js';

export const OpenApiMetaSymbol = Symbol('openapi-meta');

type AtLeastOneConverter = [SchemaConverter, ...SchemaConverter[]];

export type OpenApiEnvironmentExtension = {
  openapi: {
    documentPath: string;
  };
};

export type OpenApiMeta = {
  summary?: string;
  description?: string;
  tags?: string[];
  operationId?: string;
  exclude?: boolean;
};

export type OpenApiOptions = {
  info: InfoObject;
  servers?: ServerObject[];
  documentPath?: string;
  converters: AtLeastOneConverter;
};

export function openApiMeta(meta: OpenApiMeta): KoriRoutePluginMetadata {
  return {
    [OpenApiMetaSymbol]: meta,
  };
}

export function openApiPlugin<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(
  options: OpenApiOptions,
): KoriPlugin<Env, Req, Res, OpenApiEnvironmentExtension, unknown, unknown> {
  const documentPath = options.documentPath ?? '/openapi.json';

  const collector = createRouteCollector();

  for (const converter of options.converters) {
    collector.addConverter(converter);
  }

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
      kori.get(documentPath, {
        handler: (ctx) => {
          const doc = generateDocument();
          return ctx.res.json(doc);
        },
        pluginMetadata: openApiMeta({ exclude: true }),
      });

      return kori.onInit((ctx) => {
        // Collect route metadata from the kori instance (after all routes are registered)
        const routeDefinitions = kori.routeDefinitions();
        for (const routeDef of routeDefinitions) {
          const metadata = routeDef.pluginMetadata?.[OpenApiMetaSymbol] as OpenApiMeta;
          if (metadata?.exclude) {
            continue;
          }

          collector.addRoute({
            method: getMethodString(routeDef.method),
            path: routeDef.path,
            requestSchema: routeDef.requestSchema,
            responseSchema: routeDef.responseSchema,
            metadata,
          });
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

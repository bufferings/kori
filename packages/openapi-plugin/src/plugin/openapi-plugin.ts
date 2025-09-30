import {
  defineKoriPlugin,
  type KoriPlugin,
  type KoriResponse,
  type KoriRequest,
  type KoriEnvironment,
  createKoriPluginLogger,
} from '@korix/kori';
import { type OpenAPIObject } from 'openapi3-ts/oas31';

import { createOpenApiDocumentGenerator } from '../generator/index.js';
import { PLUGIN_VERSION } from '../version/index.js';

import { openApiMeta } from './openapi-plugin-meta.js';
import { type OpenApiPluginOptions } from './openapi-plugin-options.js';

export type OpenApiEnvExtension = {
  openapi: {
    documentPath: string;
  };
};

const PLUGIN_NAME = 'openapi-plugin';

export function openApiPlugin<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(
  options: OpenApiPluginOptions,
): KoriPlugin<Env, Req, Res, OpenApiEnvExtension, object, object> {
  const documentPath = options.documentPath ?? '/openapi.json';

  const generateOpenApiDocument = createOpenApiDocumentGenerator({
    info: options.info,
    servers: options.servers,
    converters: options.converters,
  });

  let cachedDocument: OpenAPIObject | null = null;

  return defineKoriPlugin({
    name: PLUGIN_NAME,
    version: PLUGIN_VERSION,
    apply: (kori) => {
      // Add OpenAPI document endpoint
      kori.get(documentPath, {
        handler: (ctx) => {
          if (!cachedDocument) {
            const log = createKoriPluginLogger({ baseLogger: ctx.log(), pluginName: PLUGIN_NAME });
            cachedDocument = generateOpenApiDocument({ routeDefinitions: kori.routeDefinitions(), log });
          }
          return ctx.res.json(cachedDocument);
        },
        pluginMeta: openApiMeta({ exclude: true }),
      });

      return kori.onStart((ctx) => {
        return ctx.withEnv({
          openapi: {
            documentPath,
          },
        });
      });
    },
  });
}

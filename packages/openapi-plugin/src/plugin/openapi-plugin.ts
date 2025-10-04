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

/**
 * Environment extension added by the OpenAPI plugin.
 *
 * Provides access to OpenAPI document configuration through the environment.
 */
export type OpenApiEnvExtension = {
  openapi: {
    /** Path where the OpenAPI document is served */
    documentPath: string;
  };
};

const PLUGIN_NAME = 'openapi-plugin';

/**
 * Creates a plugin that generates and serves OpenAPI documentation.
 *
 * Automatically generates an OpenAPI 3.1.0 document from registered routes
 * and serves it at the configured path (default: "/openapi.json"). The
 * document is cached after first generation for performance.
 *
 * Routes can customize their OpenAPI metadata using {@link openApiMeta}.
 *
 * @param options - Plugin configuration options
 * @returns Kori plugin that adds OpenAPI document generation and serving
 *
 * @example
 * ```typescript
 * const kori = createKori()
 *   .applyPlugin(openApiPlugin({
 *     info: {
 *       title: 'My API',
 *       version: '1.0.0'
 *     },
 *     converters: [myConverter]
 *   }));
 * ```
 */
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
        pluginMeta: openApiMeta({ exclude: true }),
        handler: (ctx) => {
          if (!cachedDocument) {
            const log = createKoriPluginLogger({ baseLogger: ctx.log(), pluginName: PLUGIN_NAME });
            cachedDocument = generateOpenApiDocument({ routeDefinitions: kori.routeDefinitions(), log });
          }
          return ctx.res.json(cachedDocument);
        },
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

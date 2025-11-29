import {
  defineKoriPlugin,
  type KoriPlugin,
  type KoriResponse,
  type KoriRequest,
  type KoriEnvironment,
  createKoriPluginLogger,
  HttpResponseHeader,
} from '@korix/kori';
import { type OpenApiEnvExtension, openApiMeta } from '@korix/openapi-plugin';

import {
  SWAGGER_UI_CSS,
  SWAGGER_UI_JS,
  SWAGGER_UI_STANDALONE_PRESET_JS,
  SWAGGER_UI_CSS_HASH,
  SWAGGER_UI_JS_HASH,
  SWAGGER_UI_STANDALONE_PRESET_JS_HASH,
} from './assets/index.js';

import { PLUGIN_VERSION } from './version.js';

const PLUGIN_NAME = 'openapi-swagger-ui';

/**
 * Generates HTML page for Swagger UI.
 *
 * @internal
 */
function generateSwaggerHtml(options: {
  documentUrl: string;
  title: string;
  cssUrl: string;
  bundleJsUrl: string;
  standalonePresetJsUrl: string;
}): string {
  const { documentUrl, title, cssUrl, bundleJsUrl, standalonePresetJsUrl } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <link rel="stylesheet" type="text/css" href="${cssUrl}" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${bundleJsUrl}"></script>
  <script src="${standalonePresetJsUrl}"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: '${documentUrl}',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;
}

/**
 * Options for configuring Swagger UI plugin.
 */
export type SwaggerUiOptions = {
  /**
   * Path where the Swagger UI will be served.
   * Defaults to '/docs'.
   */
  path?: string;

  /**
   * Title of the API documentation page.
   * Defaults to 'API Documentation'.
   */
  title?: string;
};

/**
 * Creates a Swagger UI plugin for serving OpenAPI documentation.
 *
 * This plugin serves the Swagger UI interface for visualizing OpenAPI specifications.
 * It requires the openApiPlugin to be registered first.
 *
 * @param options - Configuration options for the Swagger UI
 * @returns Kori plugin instance
 *
 * @example
 * ```typescript
 * import { createKori } from '@korix/kori';
 * import { zodOpenApiPlugin } from '@korix/zod-openapi-plugin';
 * import { swaggerUiPlugin } from '@korix/openapi-swagger-ui-plugin';
 *
 * const app = createKori()
 *   .applyPlugin(zodOpenApiPlugin({
 *     info: { title: 'My API', version: '1.0.0' },
 *   }))
 *   .applyPlugin(swaggerUiPlugin({
 *     path: '/docs',
 *     title: 'My API Documentation',
 *   }));
 * ```
 */
export function swaggerUiPlugin<
  Env extends KoriEnvironment & OpenApiEnvExtension,
  Req extends KoriRequest,
  Res extends KoriResponse,
>(options: SwaggerUiOptions = {}): KoriPlugin<Env, Req, Res> {
  const { path: uiPath = '/docs', title = 'API Documentation' } = options;

  // Normalize path: remove trailing slashes
  const normalizedPath = uiPath.replace(/\/$/, '');
  const assetsPath = `${normalizedPath}/assets`;

  // Asset URLs with content hashes for cache-busting
  const cssUrl = `${assetsPath}/swagger-ui.${SWAGGER_UI_CSS_HASH}.css`;
  const bundleJsUrl = `${assetsPath}/swagger-ui-bundle.${SWAGGER_UI_JS_HASH}.js`;
  const standalonePresetJsUrl = `${assetsPath}/swagger-ui-standalone-preset.${SWAGGER_UI_STANDALONE_PRESET_JS_HASH}.js`;

  return defineKoriPlugin({
    name: PLUGIN_NAME,
    version: PLUGIN_VERSION,
    apply(kori) {
      const log = createKoriPluginLogger({ baseLogger: kori.log(), pluginName: PLUGIN_NAME });

      log.info('Swagger UI initialized', {
        path: uiPath,
        title,
        assetsPath,
      });

      return kori
        .onStart((ctx) => {
          const documentPath = ctx.env.openapi.documentPath;

          log.info('Generating Swagger UI HTML', {
            documentUrl: documentPath,
            title,
            cssUrl,
            bundleJsUrl,
            standalonePresetJsUrl,
          });

          return ctx.withEnv({
            swaggerUi: {
              html: generateSwaggerHtml({
                documentUrl: documentPath,
                title,
                cssUrl,
                bundleJsUrl,
                standalonePresetJsUrl,
              }),
            },
          });
        })
        .get(normalizedPath || '/', {
          handler: (ctx) => {
            return ctx.res
              .setHeader(HttpResponseHeader.CACHE_CONTROL, 'no-cache, no-store, must-revalidate')
              .html(ctx.env.swaggerUi.html);
          },
          pluginMeta: openApiMeta({ exclude: true }),
        })
        .get(cssUrl, {
          handler: (ctx) => {
            return ctx.res
              .setHeader(HttpResponseHeader.CONTENT_TYPE, 'text/css; charset=utf-8')
              .setHeader(HttpResponseHeader.CACHE_CONTROL, 'private, max-age=31536000, immutable')
              .text(SWAGGER_UI_CSS);
          },
          pluginMeta: openApiMeta({ exclude: true }),
        })
        .get(bundleJsUrl, {
          handler: (ctx) => {
            return ctx.res
              .setHeader(HttpResponseHeader.CONTENT_TYPE, 'application/javascript; charset=utf-8')
              .setHeader(HttpResponseHeader.CACHE_CONTROL, 'private, max-age=31536000, immutable')
              .text(SWAGGER_UI_JS);
          },
          pluginMeta: openApiMeta({ exclude: true }),
        })
        .get(standalonePresetJsUrl, {
          handler: (ctx) => {
            return ctx.res
              .setHeader(HttpResponseHeader.CONTENT_TYPE, 'application/javascript; charset=utf-8')
              .setHeader(HttpResponseHeader.CACHE_CONTROL, 'private, max-age=31536000, immutable')
              .text(SWAGGER_UI_STANDALONE_PRESET_JS);
          },
          pluginMeta: openApiMeta({ exclude: true }),
        });
    },
  });
}

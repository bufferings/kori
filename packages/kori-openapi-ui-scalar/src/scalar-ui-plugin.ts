import { defineKoriPlugin, type KoriPlugin, type KoriResponse, type KoriRequest, type KoriEnvironment } from 'kori';
import { type OpenApiEnvironmentExtension } from 'kori-openapi-plugin';

export type ScalarUiOptions = {
  path?: string;
  title?: string;
  theme?: 'light' | 'dark' | 'auto';
  customCss?: string;
  proxyUrl?: string;
};

export function scalarUiPlugin<
  Env extends KoriEnvironment & OpenApiEnvironmentExtension,
  Req extends KoriRequest,
  Res extends KoriResponse,
>(
  options: ScalarUiOptions = {},
): KoriPlugin<
  Env,
  Req,
  Res,
  unknown,
  unknown,
  unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
> {
  return defineKoriPlugin({
    name: 'openapi-ui-scalar',
    apply(kori) {
      const uiPath = options.path ?? '/docs';
      const title = options.title ?? 'API Documentation';

      kori.addRoute({
        method: 'GET',
        path: uiPath,
        handler: (ctx) => {
          const documentPath = ctx.env.openapi?.documentPath;
          if (!documentPath) {
            throw new Error('openApiPlugin must be registered before scalarUiPlugin');
          }

          const html = generateScalarHTML({
            documentUrl: documentPath,
            title,
            theme: options.theme ?? 'auto',
            customCss: options.customCss,
            proxyUrl: options.proxyUrl,
          });
          return ctx.res.html(html);
        },
      });

      return kori;
    },
  });
}

type ScalarHTMLOptions = {
  documentUrl: string;
  title: string;
  theme: string;
  customCss?: string;
  proxyUrl?: string;
};

function generateScalarHTML(options: ScalarHTMLOptions): string {
  const customCssTag = options.customCss ? `<style>${options.customCss}</style>` : '';
  const proxyUrlConfig = options.proxyUrl ? `proxyUrl: '${options.proxyUrl}',` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${options.title}</title>
  ${customCssTag}
</head>
<body>
  <div id="scalar-container"></div>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  <script>
    Scalar.createApiReference('#scalar-container', {
      url: '${options.documentUrl}',
      theme: '${options.theme}',
      ${proxyUrlConfig}
    });
  </script>
</body>
</html>`;
}

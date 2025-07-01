import { openApiPlugin, type OpenApiOptions } from 'kori-openapi-plugin';

import { createZodSchemaConverter } from './converter.js';

export type ZodOpenApiOptions = Omit<OpenApiOptions, 'converters'>;

export function zodOpenApiPlugin(options: ZodOpenApiOptions): ReturnType<typeof openApiPlugin> {
  return openApiPlugin({
    ...options,
    converters: [createZodSchemaConverter()],
  });
}

export { createZodSchemaConverter } from './converter.js';
export { openApiMeta } from 'kori-openapi-plugin';

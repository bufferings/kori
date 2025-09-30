import { type KoriRequest, type KoriEnvironment, type KoriResponse, type KoriPlugin } from '@korix/kori';
import { openApiPlugin, type OpenApiEnvExtension, type OpenApiPluginOptions } from '@korix/openapi-plugin';

import { createZodSchemaConverter } from './zod-schema-converter.js';

export type ZodOpenApiOptions = Omit<OpenApiPluginOptions, 'converters'>;

export function zodOpenApiPlugin<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(
  options: ZodOpenApiOptions,
): KoriPlugin<Env, Req, Res, OpenApiEnvExtension, object, object> {
  return openApiPlugin<Env, Req, Res>({
    ...options,
    converters: [createZodSchemaConverter()],
  });
}

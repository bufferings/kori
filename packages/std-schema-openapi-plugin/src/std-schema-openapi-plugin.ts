import { type KoriRequest, type KoriEnvironment, type KoriResponse, type KoriPlugin } from '@korix/kori';
import { openApiPlugin, type OpenApiEnvExtension, type OpenApiPluginOptions } from '@korix/openapi-plugin';

import { createStdSchemaConverter } from './std-schema-converter.js';

export type StdSchemaOpenApiOptions = Omit<OpenApiPluginOptions, 'converters'>;

export function stdSchemaOpenApiPlugin<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(
  options: StdSchemaOpenApiOptions,
): KoriPlugin<Env, Req, Res, OpenApiEnvExtension, object, object> {
  return openApiPlugin<Env, Req, Res>({
    ...options,
    converters: [createStdSchemaConverter()],
  });
}

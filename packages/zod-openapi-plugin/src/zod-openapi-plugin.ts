import { type KoriRequest, type KoriEnvironment, type KoriResponse, type KoriPlugin } from '@korix/kori';
import { openApiPlugin, type OpenApiOptions, type OpenApiEnvironmentExtension } from '@korix/openapi-plugin';

import { createZodSchemaConverter } from './zod-schema-converter.js';

export type ZodOpenApiOptions = Omit<OpenApiOptions, 'converters'>;

export function zodOpenApiPlugin<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(
  options: ZodOpenApiOptions,
): KoriPlugin<Env, Req, Res, OpenApiEnvironmentExtension, object, object> {
  return openApiPlugin<Env, Req, Res>({
    ...options,
    converters: [createZodSchemaConverter()],
  });
}

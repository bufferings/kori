import { type KoriRoutePluginMeta } from '@korix/kori';

/** @packageInternal */
export const OpenApiPluginMetaKey = Symbol('openapi-plugin-meta');

export type OpenApiPluginMeta = {
  summary?: string;
  description?: string;
  tags?: string[];
  operationId?: string;
  exclude?: boolean;
};

export function openApiMeta(meta: OpenApiPluginMeta): KoriRoutePluginMeta {
  return {
    [OpenApiPluginMetaKey]: meta,
  };
}

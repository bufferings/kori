import { type KoriRoutePluginMeta } from '@korix/kori';

/**
 * Symbol key for storing OpenAPI plugin metadata in route definitions.
 *
 * @packageInternal
 */
export const OpenApiPluginMetaKey = Symbol('openapi-plugin-meta');

/**
 * Metadata for customizing OpenAPI operation generation.
 *
 * Used with {@link openApiMeta} to configure how a route appears in the
 * generated OpenAPI document.
 */
export type OpenApiPluginMeta = {
  /** Short summary of the operation */
  summary?: string;
  /** Detailed description of the operation */
  description?: string;
  /** Tags for grouping operations */
  tags?: string[];
  /** Unique identifier for the operation (auto-generated if not specified) */
  operationId?: string;
  /** If true, excludes this route from the OpenAPI document */
  exclude?: boolean;
};

/**
 * Creates plugin metadata for customizing OpenAPI operation generation.
 *
 * Use this function to attach OpenAPI-specific metadata to routes, such as
 * summary, description, tags, or to exclude routes from the generated document.
 *
 * @param meta - OpenAPI metadata to attach to the route
 * @returns Plugin metadata object to be passed as pluginMeta property
 *
 * @example
 * ```typescript
 * kori.get('/users/:id', {
 *   pluginMeta: openApiMeta({
 *     summary: 'Get user by ID',
 *     tags: ['users']
 *   }),
 *   handler: (ctx) => ctx.res.json({ id: ctx.req.params.id })
 * });
 * ```
 */
export function openApiMeta(meta: OpenApiPluginMeta): KoriRoutePluginMeta {
  return {
    [OpenApiPluginMetaKey]: meta,
  };
}

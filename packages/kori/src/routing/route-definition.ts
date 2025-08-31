import { type KoriRequestSchemaDefault } from '../request-schema/index.js';
import { type KoriResponseSchemaDefault } from '../response-schema/index.js';

import { type RouteHttpMethod } from './route-http-method.js';
import { type KoriRoutePluginMetadata } from './route.js';

/**
 * Registered route definition containing metadata for route introspection.
 *
 * Represents a route that has been registered with the Kori instance,
 * including its HTTP method, path pattern, schemas, and plugin metadata.
 * Used for route discovery, introspection, and debugging.
 *
 * @example
 * ```typescript
 * // Example route definition
 * const MyPluginKey = Symbol('my-plugin');
 * const routeDefinition: KoriRouteDefinition = {
 *   method: 'POST',
 *   path: '/users/:id',
 *   requestSchema: userUpdateSchema,
 *   responseSchema: userResponseSchema,
 *   pluginMetadata: { [MyPluginKey]: { tags: ['users'] } }
 * };
 * ```
 */
export type KoriRouteDefinition = {
  /** HTTP method for this route */
  method: RouteHttpMethod;
  /** URL path pattern with parameter placeholders */
  path: string;
  /** Optional request schema for validation */
  requestSchema?: KoriRequestSchemaDefault;
  /** Optional response schema for validation */
  responseSchema?: KoriResponseSchemaDefault;
  /** Optional metadata added by plugins */
  pluginMetadata?: KoriRoutePluginMetadata;
};

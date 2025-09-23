import { type KoriRequestSchemaBase } from '../request-schema/index.js';
import { type KoriResponseSchemaBase } from '../response-schema/index.js';

import { type RouteHttpMethod } from './route-http-method.js';
import { type KoriRoutePluginMetadata } from './route.js';

/**
 * Registered route definition containing metadata for route introspection.
 *
 * Represents a route that has been registered with the Kori instance,
 * including its HTTP method, path pattern, schemas, and plugin metadata.
 * Used for route discovery, introspection, and debugging.
 */
export type KoriRouteDefinition = {
  /** HTTP method for this route */
  method: RouteHttpMethod;
  /** URL path pattern with parameter placeholders */
  path: string;
  /** Optional request schema for validation */
  requestSchema?: KoriRequestSchemaBase;
  /** Optional response schema for validation */
  responseSchema?: KoriResponseSchemaBase;
  /** Optional metadata added by plugins */
  pluginMetadata?: KoriRoutePluginMetadata;
};

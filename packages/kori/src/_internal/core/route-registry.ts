import { type KoriRequestSchemaDefault } from '../../request-schema/index.js';
import { type KoriResponseSchemaDefault } from '../../response-schema/index.js';
import { type KoriRouteId } from '../../route-matcher/index.js';
import { type KoriRoutePluginMetadata, type RouteHttpMethod } from '../../routing/index.js';

/**
 * Runtime route record stored in the registry.
 *
 * Contains type-erased handlers and validation functions for execution.
 * Type information is preserved at registration but erased for storage.
 *
 * @internal
 */
export type RouteRecord = {
  /** HTTP method for this route */
  method: RouteHttpMethod;
  /** Full path including any prefix */
  path: string;
  /** Request schema for validation (if any) */
  requestSchema?: KoriRequestSchemaDefault;
  /** Response schema for validation (if any) */
  responseSchema?: KoriResponseSchemaDefault;
  /** Route handler function (type-erased for storage) */
  handler: unknown;
  /** Plugin metadata attached to this route */
  pluginMetadata?: KoriRoutePluginMetadata;
};

/**
 * Registry for storing and retrieving route records.
 *
 * Maintains insertion order and provides access to route handlers
 * and metadata for both execution and introspection.
 *
 * @internal
 */
export type KoriRouteRegistry = {
  /** Register a route record and return its unique ID */
  register(record: RouteRecord): KoriRouteId;
  /** Retrieve a route record by its ID */
  get(routeId: KoriRouteId): RouteRecord | undefined;
  /** Get all registered route records in insertion order */
  getAll(): RouteRecord[];
};

/**
 * Creates a new route registry instance.
 *
 * Uses Map for insertion-order preservation and efficient lookups.
 *
 * @internal
 */
export function createRouteRegistry(): KoriRouteRegistry {
  const idToRecord = new Map<KoriRouteId, RouteRecord>();

  return {
    register(record: RouteRecord): KoriRouteId {
      const id = Symbol('kori-route');
      idToRecord.set(id, record);
      return id;
    },

    get(routeId: KoriRouteId): RouteRecord | undefined {
      return idToRecord.get(routeId);
    },

    getAll(): RouteRecord[] {
      return Array.from(idToRecord.values());
    },
  };
}

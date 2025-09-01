import { type KoriRequestSchemaDefault } from '../../request-schema/index.js';
import { type KoriResponseSchemaDefault } from '../../response-schema/index.js';
import { type KoriRouteId } from '../../route-matcher/index.js';
import { type KoriRoutePluginMetadata, type RouteHttpMethod } from '../../routing/index.js';

export type RouteRecord = {
  method: RouteHttpMethod;
  path: string;
  requestSchema?: KoriRequestSchemaDefault;
  responseSchema?: KoriResponseSchemaDefault;
  handler: unknown;
  onRequestValidationError?: unknown;
  onResponseValidationError?: unknown;
  pluginMetadata?: KoriRoutePluginMetadata;
};

export type KoriRouteRegistry = {
  register(record: RouteRecord): KoriRouteId;
  get(routeId: KoriRouteId): RouteRecord | undefined;
  getAll(): RouteRecord[];
};

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

import { type KoriRequestSchemaDefault } from '../request-schema/index.js';
import { type KoriResponseSchemaDefault } from '../response-schema/index.js';

import { type RouteHttpMethod } from './route-http-method.js';
import { type KoriRoutePluginMetadata } from './route.js';

export type KoriRouteDefinition = {
  method: RouteHttpMethod;
  path: string;
  requestSchema?: KoriRequestSchemaDefault;
  responseSchema?: KoriResponseSchemaDefault;
  pluginMetadata?: KoriRoutePluginMetadata;
};

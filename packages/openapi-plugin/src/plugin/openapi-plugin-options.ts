import { type InfoObject, type ServerObject } from 'openapi3-ts/oas31';

import { type SchemaConverter } from '../schema-converter/index.js';

/**
 * Configuration options for the OpenAPI plugin.
 *
 * Defines how OpenAPI documentation is generated and served, including
 * document metadata, server information, and schema conversion.
 */
export type OpenApiPluginOptions = {
  /** OpenAPI document metadata (title, version, description, etc.) */
  info: InfoObject;
  /** Optional array of server objects (defaults to single server at "/") */
  servers?: ServerObject[];
  /** Path where OpenAPI document will be served (defaults to "/openapi.json") */
  documentPath?: string;
  /** Array of schema converters to handle different schema types */
  converters: SchemaConverter[];
};

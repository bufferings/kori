import { type InfoObject, type ServerObject } from 'openapi3-ts/oas31';

import { type SchemaConverter } from '../schema-converter/index.js';

export type OpenApiPluginOptions = {
  info: InfoObject;
  servers?: ServerObject[];
  documentPath?: string;
  converters: SchemaConverter[];
};

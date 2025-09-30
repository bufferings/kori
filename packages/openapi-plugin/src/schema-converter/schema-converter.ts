import { type KoriSchemaBase } from '@korix/kori';
import { type SchemaObject } from 'openapi3-ts/oas31';

export type ConvertSchemaFn = ({ schema }: { schema: KoriSchemaBase }) => SchemaObject | undefined;

export type SchemaConverter = {
  name: string;
  canConvert: ({ schema }: { schema: KoriSchemaBase }) => boolean;
  convert: ConvertSchemaFn;
};

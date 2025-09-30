import { type SchemaConverter, type ConvertSchemaFn } from '../schema-converter/index.js';

/** @internal */
export function composeConverters(converters: SchemaConverter[]): ConvertSchemaFn {
  const convert: ConvertSchemaFn = ({ schema }) => {
    for (const converter of converters) {
      if (converter.canConvert({ schema })) {
        return converter.convert({ schema });
      }
    }
    return {};
  };

  return convert;
}

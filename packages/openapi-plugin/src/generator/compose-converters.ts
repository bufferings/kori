import { type SchemaConverter, type ConvertSchemaFn } from '../schema-converter/index.js';

/**
 * Combines multiple schema converters into a single conversion function
 * that tries each converter in order.
 *
 * The first converter that can handle the schema will be used. If no
 * converter matches, returns undefined.
 *
 * @param converters - Array of schema converters to combine
 * @returns A conversion function that delegates to the first matching converter
 *
 * @internal
 */
export function composeConverters(converters: SchemaConverter[]): ConvertSchemaFn {
  const convert: ConvertSchemaFn = ({ schema }) => {
    for (const converter of converters) {
      if (converter.canConvert({ schema })) {
        return converter.convert({ schema });
      }
    }
    return undefined;
  };

  return convert;
}

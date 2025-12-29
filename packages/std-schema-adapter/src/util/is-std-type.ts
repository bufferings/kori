import { type StandardSchemaV1 } from '@standard-schema/spec';

/** @packageInternal */
export function isStdType(value: unknown): value is StandardSchemaV1 {
  return !!value && '~standard' in Object(value);
}

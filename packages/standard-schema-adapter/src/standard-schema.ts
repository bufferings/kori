import { type KoriSchema, createKoriSchema, isKoriSchema } from '@korix/kori';
import { type StandardSchemaV1 } from '@standard-schema/spec';

export const STANDARD_SCHEMA_PROVIDER = 'standard-schema';

export type KoriStandardSchemaProvider = typeof STANDARD_SCHEMA_PROVIDER;

export type KoriStandardSchema<T extends StandardSchemaV1> = KoriSchema<
  KoriStandardSchemaProvider,
  T,
  StandardSchemaV1.InferOutput<T>
>;

export type KoriStandardSchemaBase = KoriStandardSchema<StandardSchemaV1>;

export function isKoriStandardSchema(value: unknown): value is KoriStandardSchemaBase {
  if (!isKoriSchema(value)) {
    return false;
  }
  return value.provider === STANDARD_SCHEMA_PROVIDER;
}

export const createKoriStandardSchema = <T extends StandardSchemaV1>(schema: T): KoriStandardSchema<T> => {
  return createKoriSchema<KoriStandardSchemaProvider, T, StandardSchemaV1.InferOutput<T>>({
    provider: STANDARD_SCHEMA_PROVIDER,
    definition: schema,
  });
};

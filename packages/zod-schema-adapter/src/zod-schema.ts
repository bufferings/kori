import { type KoriSchema, createKoriSchema, isKoriSchema } from '@korix/kori';
import { type z } from 'zod';

export const ZOD_SCHEMA_PROVIDER = 'zod';

export type KoriZodSchemaProvider = typeof ZOD_SCHEMA_PROVIDER;

export type KoriZodSchema<T extends z.ZodType> = KoriSchema<KoriZodSchemaProvider, T, z.output<T>>;

export type KoriZodSchemaBase = KoriZodSchema<z.ZodType>;

export const createKoriZodSchema = <T extends z.ZodType>(schema: T): KoriZodSchema<T> => {
  return createKoriSchema<KoriZodSchemaProvider, T, z.output<T>>({ provider: ZOD_SCHEMA_PROVIDER, definition: schema });
};

export function isKoriZodSchema(value: unknown): value is KoriZodSchemaBase {
  if (!isKoriSchema(value)) {
    return false;
  }
  return value.provider === ZOD_SCHEMA_PROVIDER;
}

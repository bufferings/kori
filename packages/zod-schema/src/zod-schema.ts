import { type KoriSchema, createKoriSchema, getKoriSchemaProvider, isKoriSchema } from '@korix/kori';
import { type z } from 'zod';

export const ZodSchemaProvider = Symbol('zod-schema-provider');

export type KoriZodSchemaProvider = typeof ZodSchemaProvider;

export type KoriZodSchema<T extends z.ZodType> = KoriSchema<KoriZodSchemaProvider, T, z.output<T>>;

export type KoriZodSchemaDefault = KoriZodSchema<z.ZodType>;

export const createKoriZodSchema = <T extends z.ZodType>(schema: T): KoriZodSchema<T> => {
  return createKoriSchema(ZodSchemaProvider, schema);
};

export function isKoriZodSchema(value: unknown): value is KoriZodSchemaDefault {
  if (!isKoriSchema(value)) {
    return false;
  }
  return getKoriSchemaProvider(value) === ZodSchemaProvider;
}

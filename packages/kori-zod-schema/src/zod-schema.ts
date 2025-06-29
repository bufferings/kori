import { type KoriSchema, type KoriSchemaProvider, createKoriSchema } from 'kori';
import { type z } from 'zod';

export type KoriZodSchemaProvider = KoriSchemaProvider<'zod'>;

export type KoriZodSchema<T extends z.ZodType> = KoriSchema<T, z.output<T>>;

export type KoriZodSchemaDefault = KoriZodSchema<z.ZodType>;

export const createKoriZodSchema = <T extends z.ZodType>(schema: T): KoriZodSchema<T> => {
  return createKoriSchema(schema);
};

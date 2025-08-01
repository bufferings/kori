import {
  type KoriSchema,
  type KoriSchemaProvider,
  createKoriSchema,
  isKoriSchema,
  getKoriSchemaBrand,
} from '@korix/kori';
import { type z } from 'zod';

const ZodSchemaBrand = Symbol('zod-schema-brand');

export type KoriZodSchemaProvider = KoriSchemaProvider<'zod'>;

export type KoriZodSchema<T extends z.ZodType> = KoriSchema<T, z.output<T>>;

export type KoriZodSchemaDefault = KoriZodSchema<z.ZodType>;

export const createKoriZodSchema = <T extends z.ZodType>(schema: T): KoriZodSchema<T> => {
  return createKoriSchema(ZodSchemaBrand, schema);
};

export function isKoriZodSchema(value: unknown): value is KoriZodSchemaDefault {
  if (!isKoriSchema(value)) {
    return false;
  }
  return getKoriSchemaBrand(value) === ZodSchemaBrand;
}

import { type KoriResponseSchema, type KoriResponseSchemaStructure } from 'kori';
import { type z } from 'zod/v4';

import { type KoriZodSchema, type KoriZodSchemaProvider } from './zod-schema.js';

export type KoriZodResponseSchema<S extends KoriZodSchema<z.ZodType>> = KoriResponseSchema<KoriZodSchemaProvider, S>;

export function zodResponseSchema<S extends KoriZodSchema<z.ZodType>>(
  schema: KoriResponseSchemaStructure<S>,
): KoriZodResponseSchema<S> {
  return schema;
}

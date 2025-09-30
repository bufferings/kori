import { type z } from 'zod';

import { type KoriZodSchema, createKoriZodSchema } from '../zod-schema/index.js';

/**
 * Maps each content-type entry from Zod definitions to Kori schema items.
 *
 * @template M - Content-type mapping supplied to the request schema builder
 */
export type KoriRequestSchemaZodToBodyMapping<M extends Record<string, z.ZodType>> = {
  [K in keyof M]: KoriZodSchema<M[K]>;
};

/**
 * Transforms a Zod body mapping to a Kori body mapping.
 *
 * @template M - The Zod body mapping to transform
 * @param m - The Zod body mapping to transform
 * @returns The Kori body mapping
 *
 * @internal
 */
export function toKoriBodyMapping<M extends Record<string, z.ZodType>>(m: M): KoriRequestSchemaZodToBodyMapping<M> {
  const out: Record<string, KoriZodSchema<z.ZodType>> = {};
  for (const [mt, item] of Object.entries(m)) {
    out[mt] = createKoriZodSchema(item);
  }
  return out as KoriRequestSchemaZodToBodyMapping<M>;
}

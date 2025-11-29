import { type KoriRequestSchemaContentEntry } from '@korix/kori';
import { type z } from 'zod';

import { isZodType } from '../util/index.js';
import { type KoriZodSchema, createKoriZodSchema } from '../zod-schema/index.js';

import { type KoriZodRequestSchemaContentEntry } from './body-content.js';

/**
 * Maps each content-type entry from Zod definitions to Kori schema items.
 *
 * @template M - Content-type mapping supplied to the request schema builder
 */
export type KoriRequestSchemaZodToBodyMapping<M extends Record<string, z.ZodType>> = {
  [K in keyof M]: KoriZodSchema<M[K]>;
};

/**
 * Return type of toKoriBodyMapping transformer.
 * Represents the content object structure expected by KoriRequestSchemaContentBody.
 */
type KoriZodBodyContent<M extends Record<string, z.ZodType>> = {
  [K in keyof M]: KoriRequestSchemaContentEntry<KoriZodSchema<M[K]>>;
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
export function toKoriBodyMapping<M extends Record<string, z.ZodType>>(m: {
  [K in keyof M]: KoriZodRequestSchemaContentEntry<M[K]>;
}): KoriZodBodyContent<M> {
  const out: Record<string, KoriRequestSchemaContentEntry<KoriZodSchema<z.ZodType>>> = {};
  for (const [mt, item] of Object.entries(m)) {
    const entry = item as KoriZodRequestSchemaContentEntry<M[keyof M]>;
    if (isZodType(entry)) {
      out[mt] = createKoriZodSchema(entry);
    } else {
      out[mt] = {
        schema: createKoriZodSchema(entry.schema),
        parseType: entry.parseType,
      };
    }
  }
  return out as KoriZodBodyContent<M>;
}

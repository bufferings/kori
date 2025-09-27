import { type KoriRequestSchemaContentBodyItem } from '@korix/kori';
import { type z } from 'zod';

import { isZodType } from '../util/index.js';
import { type KoriZodSchema, createKoriZodSchema } from '../zod-schema/index.js';

import {
  type KoriZodRequestSchemaContentBodyItem,
  type KoriZodRequestSchemaContentBodyItemBase,
  type KoriZodRequestSchemaContentBodyMappingBase,
} from './body-content.js';

/**
 * Maps a Zod body item definition to the matching Kori schema item type.
 *
 * @template Item - Zod content item definition provided in the request body options
 */
export type KoriRequestSchemaZodToBodyItem<Item extends KoriZodRequestSchemaContentBodyItemBase> =
  Item extends z.ZodType
    ? KoriZodSchema<Item>
    : Item extends { schema: infer S; examples?: infer X }
      ? S extends z.ZodType
        ? { schema: KoriZodSchema<S>; examples?: X }
        : never
      : never;

/**
 * Maps each content-type entry from Zod definitions to Kori schema items.
 *
 * @template M - Content-type mapping supplied to the request schema builder
 */
export type KoriRequestSchemaZodToBodyMapping<M extends KoriZodRequestSchemaContentBodyMappingBase> = {
  [K in keyof M]: KoriRequestSchemaZodToBodyItem<M[K]>;
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
export function toKoriBodyMapping<M extends Record<string, KoriZodRequestSchemaContentBodyItem<z.ZodType>>>(
  m: M,
): KoriRequestSchemaZodToBodyMapping<M> {
  const out: Record<string, KoriRequestSchemaContentBodyItem<KoriZodSchema<z.ZodType>>> = {};
  for (const [mt, item] of Object.entries(m)) {
    if (isZodType(item)) {
      out[mt] = createKoriZodSchema(item);
    } else {
      out[mt] = { schema: createKoriZodSchema(item.schema), examples: item.examples };
    }
  }
  return out as KoriRequestSchemaZodToBodyMapping<M>;
}

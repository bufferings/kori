import { type KoriRequestSchemaContentBodyItem } from '@korix/kori';
import { type StandardSchemaV1 } from '@standard-schema/spec';

import { type KoriStdSchema, createKoriStdSchema } from '../std-schema/index.js';
import { isStdType } from '../util/index.js';

import {
  type KoriStdRequestSchemaContentBodyItem,
  type KoriStdRequestSchemaContentBodyItemBase,
  type KoriStdRequestSchemaContentBodyMappingBase,
} from './body-content.js';

/**
 * Maps a Standard Schema body item definition to the matching Kori schema item type.
 *
 * @template Item - Standard Schema content item definition provided in the request body options
 */
export type KoriRequestSchemaStdToBodyItem<Item extends KoriStdRequestSchemaContentBodyItemBase> =
  Item extends StandardSchemaV1
    ? KoriStdSchema<Item>
    : Item extends { schema: infer S; examples?: infer X }
      ? S extends StandardSchemaV1
        ? { schema: KoriStdSchema<S>; examples?: X }
        : never
      : never;

/**
 * Maps each content-type entry from Standard Schema definitions to Kori schema items.
 *
 * @template M - Content-type mapping supplied to the request schema builder
 */
export type KoriRequestSchemaStdToBodyMapping<M extends KoriStdRequestSchemaContentBodyMappingBase> = {
  [K in keyof M]: KoriRequestSchemaStdToBodyItem<M[K]>;
};

/**
 * Transforms a Standard Schema body mapping to a Kori body mapping.
 *
 * @template M - The Standard Schema body mapping to transform
 * @param m - The Standard Schema body mapping to transform
 * @returns The Kori body mapping
 *
 * @internal
 */
export function toKoriBodyMapping<M extends Record<string, KoriStdRequestSchemaContentBodyItem<StandardSchemaV1>>>(
  m: M,
): KoriRequestSchemaStdToBodyMapping<M> {
  const out: Record<string, KoriRequestSchemaContentBodyItem<KoriStdSchema<StandardSchemaV1>>> = {};
  for (const [mt, item] of Object.entries(m)) {
    if (isStdType(item)) {
      out[mt] = createKoriStdSchema(item);
    } else {
      out[mt] = { schema: createKoriStdSchema(item.schema), examples: item.examples };
    }
  }
  return out as KoriRequestSchemaStdToBodyMapping<M>;
}

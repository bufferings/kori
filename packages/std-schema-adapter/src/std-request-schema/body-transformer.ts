import { type KoriRequestSchemaContentEntry } from '@korix/kori';
import { type StandardSchemaV1 } from '@standard-schema/spec';

import { type KoriStdSchema, createKoriStdSchema } from '../std-schema/index.js';
import { isStdType } from '../util/index.js';

import { type KoriStdRequestSchemaContentEntry } from './body-content.js';

/**
 * Maps each content-type entry from Standard Schema definitions to Kori schema items.
 *
 * @template M - Content-type mapping supplied to the request schema builder
 */
export type KoriRequestSchemaStdToBodyMapping<M extends Record<string, StandardSchemaV1>> = {
  [K in keyof M]: KoriStdSchema<M[K]>;
};

/**
 * Return type of toKoriBodyMapping transformer.
 * Represents the content object structure expected by KoriRequestSchemaContentBody.
 */
type KoriStdBodyContent<M extends Record<string, StandardSchemaV1>> = {
  [K in keyof M]: KoriRequestSchemaContentEntry<KoriStdSchema<M[K]>>;
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
export function toKoriBodyMapping<M extends Record<string, StandardSchemaV1>>(m: {
  [K in keyof M]: KoriStdRequestSchemaContentEntry<M[K]>;
}): KoriStdBodyContent<M> {
  const out: Record<string, KoriRequestSchemaContentEntry<KoriStdSchema<StandardSchemaV1>>> = {};
  for (const [mt, item] of Object.entries(m)) {
    const entry = item as KoriStdRequestSchemaContentEntry<M[keyof M]>;
    if (isStdType(entry)) {
      out[mt] = createKoriStdSchema(entry);
    } else {
      out[mt] = {
        schema: createKoriStdSchema(entry.schema),
        parseType: entry.parseType,
      };
    }
  }
  return out as KoriStdBodyContent<M>;
}

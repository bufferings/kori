import { type StandardSchemaV1 } from '@standard-schema/spec';

import { type KoriStdSchema, createKoriStdSchema } from '../std-schema/index.js';

/**
 * Maps each content-type entry from Standard Schema definitions to Kori schema items.
 *
 * @template M - Content-type mapping supplied to the request schema builder
 */
export type KoriRequestSchemaStdToBodyMapping<M extends Record<string, StandardSchemaV1>> = {
  [K in keyof M]: KoriStdSchema<M[K]>;
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
export function toKoriBodyMapping<M extends Record<string, StandardSchemaV1>>(
  m: M,
): KoriRequestSchemaStdToBodyMapping<M> {
  const out: Record<string, KoriStdSchema<StandardSchemaV1>> = {};
  for (const [mt, item] of Object.entries(m)) {
    out[mt] = createKoriStdSchema(item);
  }
  return out as KoriRequestSchemaStdToBodyMapping<M>;
}

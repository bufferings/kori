import {
  type KoriResponseSchemaContentEntry,
  type KoriResponseSchemaEntry,
  type KoriResponseSchemaStatusCode,
} from '@korix/kori';
import { type StandardSchemaV1 } from '@standard-schema/spec';

import { createKoriStdSchema, type KoriStdSchemaProvider, type KoriStdSchema } from '../std-schema/index.js';
import { isStdType } from '../util/index.js';

import { type KoriStdResponseSchemaEntry } from './entry.js';

/**
 * Maps each content-type entry from Standard Schema definitions to Kori schema items.
 *
 * @template M - Content-type mapping supplied to the response schema builder
 */
export type KoriResponseSchemaStdToContentMap<M extends Record<string, StandardSchemaV1>> = {
  [K in keyof M]: KoriStdSchema<M[K]>;
};

/**
 * Maps a Standard Schema response schema entry definition to the matching Kori schema entry type.
 *
 * @template E - Standard Schema response schema entry definition provided in the response schema options
 */
export type KoriResponseSchemaStdToEntry<E extends KoriStdResponseSchemaEntry> =
  // simple
  E extends StandardSchemaV1
    ? KoriStdSchema<E>
    : E extends { content: infer CM; headers?: infer H extends StandardSchemaV1 }
      ? KoriResponseSchemaContentEntry<
          KoriStdSchema<H>,
          KoriResponseSchemaStdToContentMap<Extract<CM, Record<string, StandardSchemaV1>>>
        >
      : never;

/**
 * Maps a status-code keyed record of Standard Schema response entries to the Kori schema entry map.
 *
 * @template StdResponses - Standard Schema response schema entries mapped by status code
 */
export type KoriResponseSchemaStdToEntries<
  StdResponses extends Partial<Record<KoriResponseSchemaStatusCode, KoriStdResponseSchemaEntry>>,
> = {
  [S in keyof StdResponses as StdResponses[S] extends KoriStdResponseSchemaEntry
    ? S
    : never]: KoriResponseSchemaStdToEntry<Extract<StdResponses[S], KoriStdResponseSchemaEntry>>;
};

/**
 * Maps a Standard Schema content mapping to a Kori content mapping.
 *
 * @template M - The Standard Schema content mapping to transform
 * @param content - The Standard Schema content mapping to transform
 * @returns The Kori content mapping
 */
function toKoriContent(content: Record<string, StandardSchemaV1>): Record<string, KoriStdSchema<StandardSchemaV1>> {
  const out: Record<string, KoriStdSchema<StandardSchemaV1>> = {};
  for (const [mt, item] of Object.entries(content)) {
    out[mt] = createKoriStdSchema(item);
  }
  return out;
}

/**
 * Maps a Standard Schema response schema entry to a Kori response schema entry.
 *
 * @param entry - The Standard Schema response schema entry to transform
 * @returns The Kori response schema entry
 *
 */
function toKoriEntry(entry: KoriStdResponseSchemaEntry): KoriResponseSchemaEntry<KoriStdSchemaProvider> {
  // simple entry
  if (isStdType(entry)) {
    return createKoriStdSchema(entry);
  }

  // content entry
  return {
    description: entry.description,
    headers: entry.headers ? createKoriStdSchema(entry.headers) : undefined,
    content: toKoriContent(entry.content),
  };
}

/**
 * Maps Standard Schema response entries keyed by status code to the matching Kori entries.
 *
 * @template StdResponses - Standard Schema response schema entries mapped by status code
 * @param responses - Standard Schema response schema entries mapped by status code
 *
 * @internal
 */
export function toKoriEntries<
  StdResponses extends Partial<Record<KoriResponseSchemaStatusCode, KoriStdResponseSchemaEntry>>,
>(responses: StdResponses): KoriResponseSchemaStdToEntries<StdResponses> {
  const out = {} as KoriResponseSchemaStdToEntries<StdResponses>;

  for (const status of Object.keys(responses) as (keyof StdResponses)[]) {
    const entry = responses[status];
    if (!entry) {
      continue;
    }

    const key = status as keyof KoriResponseSchemaStdToEntries<StdResponses>;
    out[key] = toKoriEntry(entry as unknown as KoriStdResponseSchemaEntry) as (typeof out)[typeof key];
  }

  return out;
}

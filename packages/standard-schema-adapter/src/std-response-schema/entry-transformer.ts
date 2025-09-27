import {
  type KoriResponseSchemaContentEntry,
  type KoriResponseSchemaContentEntryItem,
  type KoriResponseSchemaEntry,
  type KoriResponseSchemaSimpleEntry,
  type KoriResponseSchemaStatusCode,
} from '@korix/kori';
import { type StandardSchemaV1 } from '@standard-schema/spec';

import { createKoriStdSchema, type KoriStdSchemaProvider, type KoriStdSchema } from '../std-schema/index.js';
import { isStdType } from '../util/index.js';

import {
  type KoriStdResponseSchemaContentEntryItemBase,
  type KoriStdResponseSchemaContentEntryMappingBase,
} from './entry-content.js';
import { type KoriStdResponseSchemaEntry } from './entry.js';

/**
 * Maps a Standard Schema content item definition to the matching Kori schema item type.
 *
 * @template Item - Standard Schema content item definition provided in the response schema options
 */
export type KoriResponseSchemaStdToContentItem<Item extends KoriStdResponseSchemaContentEntryItemBase> =
  Item extends StandardSchemaV1
    ? KoriResponseSchemaContentEntryItem<KoriStdSchema<Item>>
    : Item extends { schema: infer S; examples?: infer EX }
      ? S extends StandardSchemaV1
        ? { schema: KoriStdSchema<S>; examples?: EX }
        : never
      : never;

/**
 * Maps each content-type entry from Standard Schema definitions to Kori schema items.
 *
 * @template M - Content-type mapping supplied to the response schema builder
 */
export type KoriResponseSchemaStdToContentMap<M extends KoriStdResponseSchemaContentEntryMappingBase> = {
  [K in keyof M]: KoriResponseSchemaStdToContentItem<M[K]>;
};

/**
 * Maps a Standard Schema response schema entry definition to the matching Kori schema entry type.
 *
 * @template E - Standard Schema response schema entry definition provided in the response schema options
 */
export type KoriResponseSchemaStdToEntry<E extends KoriStdResponseSchemaEntry> =
  // simple
  E extends StandardSchemaV1
    ? KoriResponseSchemaSimpleEntry<KoriStdSchema<StandardSchemaV1>, KoriStdSchema<E>>
    : // simple wrapper
      E extends { schema: infer S extends StandardSchemaV1; headers?: infer H extends StandardSchemaV1 }
      ? KoriResponseSchemaSimpleEntry<KoriStdSchema<H>, KoriStdSchema<S>>
      : // content: content map
        E extends { content: infer CM; headers?: infer H extends StandardSchemaV1 }
        ? KoriResponseSchemaContentEntry<
            KoriStdSchema<H>,
            KoriResponseSchemaStdToContentMap<Extract<CM, KoriStdResponseSchemaContentEntryMappingBase>>
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
function toKoriContent(
  content: KoriStdResponseSchemaContentEntryMappingBase,
): Record<string, KoriResponseSchemaContentEntryItem<KoriStdSchema<StandardSchemaV1>>> {
  const out: Record<string, KoriResponseSchemaContentEntryItem<KoriStdSchema<StandardSchemaV1>>> = {};
  for (const [mt, item] of Object.entries(content)) {
    if (isStdType(item)) {
      out[mt] = createKoriStdSchema(item);
    } else {
      out[mt] = { schema: createKoriStdSchema(item.schema), examples: item.examples };
    }
  }
  return out;
}

/**
 * Maps a Standard Schema response schema entry to a Kori response schema entry.
 *
 * Handles three types of entries: direct Standard Schema schema, content-type mapping, and simple wrapper.
 *
 * @param entry - The Standard Schema response schema entry to transform
 * @returns The Kori response schema entry
 *
 */
function toKoriEntry(entry: KoriStdResponseSchemaEntry): KoriResponseSchemaEntry<KoriStdSchemaProvider> {
  // simple: Standard Schema directly
  if (isStdType(entry)) {
    return createKoriStdSchema(entry);
  }
  // content entry
  if ('content' in entry) {
    return {
      description: entry.description,
      headers: entry.headers ? createKoriStdSchema(entry.headers) : undefined,
      content: toKoriContent(entry.content),
      links: entry.links,
    };
  }
  // simple: Standard Schema wrapper
  return {
    description: entry.description,
    headers: entry.headers ? createKoriStdSchema(entry.headers) : undefined,
    schema: createKoriStdSchema(entry.schema),
    examples: entry.examples,
    links: entry.links,
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

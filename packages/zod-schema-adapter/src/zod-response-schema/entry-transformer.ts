import {
  type KoriResponseSchemaContentEntry,
  type KoriResponseSchemaContentEntryItem,
  type KoriResponseSchemaEntry,
  type KoriResponseSchemaSimpleEntry,
  type KoriResponseSchemaStatusCode,
} from '@korix/kori';
import { type z } from 'zod';

import { isZodType } from '../util/index.js';
import { type KoriZodSchema, type KoriZodSchemaProvider, createKoriZodSchema } from '../zod-schema/index.js';

import {
  type KoriZodResponseSchemaContentEntryItemBase,
  type KoriZodResponseSchemaContentEntryMappingBase,
} from './entry-content.js';
import { type KoriZodResponseSchemaEntry } from './entry.js';

/**
 * Maps a Zod content item definition to the matching Kori schema item type.
 *
 * @template Item - Zod content item definition provided in the response schema options
 */
export type KoriResponseSchemaZodToContentItem<Item extends KoriZodResponseSchemaContentEntryItemBase> =
  Item extends z.ZodType
    ? KoriResponseSchemaContentEntryItem<KoriZodSchema<Item>>
    : Item extends { schema: infer SZ; examples?: infer EX }
      ? SZ extends z.ZodType
        ? { schema: KoriZodSchema<SZ>; examples?: EX }
        : never
      : never;

/**
 * Maps each content-type entry from Zod definitions to Kori schema items.
 *
 * @template M - Content-type mapping supplied to the response schema builder
 */
export type KoriResponseSchemaZodToContentMap<M extends KoriZodResponseSchemaContentEntryMappingBase> = {
  [K in keyof M]: KoriResponseSchemaZodToContentItem<M[K]>;
};

/**
 * Maps a Zod response schema entry definition to the matching Kori schema entry type.
 *
 * @template E - Zod response schema entry definition provided in the response schema options
 */
export type KoriResponseSchemaZodToEntry<E extends KoriZodResponseSchemaEntry> =
  // simple
  E extends z.ZodType
    ? KoriResponseSchemaSimpleEntry<KoriZodSchema<z.ZodType>, KoriZodSchema<E>>
    : // simple wrapper
      E extends { schema: infer S extends z.ZodType; headers?: infer H extends z.ZodType }
      ? KoriResponseSchemaSimpleEntry<KoriZodSchema<H>, KoriZodSchema<S>>
      : // content: content map
        E extends { content: infer CM; headers?: infer H extends z.ZodType }
        ? KoriResponseSchemaContentEntry<
            KoriZodSchema<H>,
            KoriResponseSchemaZodToContentMap<Extract<CM, KoriZodResponseSchemaContentEntryMappingBase>>
          >
        : never;

/**
 * Maps a status-code keyed record of Zod response entries to the Kori schema entry map.
 *
 * @template ZResponses - Zod response schema entries mapped by status code
 */
export type KoriResponseSchemaZodToEntries<
  ZResponses extends Partial<Record<KoriResponseSchemaStatusCode, KoriZodResponseSchemaEntry>>,
> = {
  [S in keyof ZResponses as ZResponses[S] extends KoriZodResponseSchemaEntry ? S : never]: KoriResponseSchemaZodToEntry<
    Extract<ZResponses[S], KoriZodResponseSchemaEntry>
  >;
};

/**
 * Maps a Zod content mapping to a Kori content mapping.
 *
 * @template M - The Zod content mapping to transform
 * @param content - The Zod content mapping to transform
 * @returns The Kori content mapping
 */
function toKoriContent(
  content: KoriZodResponseSchemaContentEntryMappingBase,
): Record<string, KoriResponseSchemaContentEntryItem<KoriZodSchema<z.ZodType>>> {
  const out: Record<string, KoriResponseSchemaContentEntryItem<KoriZodSchema<z.ZodType>>> = {};
  for (const [mt, item] of Object.entries(content)) {
    if (isZodType(item)) {
      out[mt] = createKoriZodSchema(item);
    } else {
      out[mt] = { schema: createKoriZodSchema(item.schema), examples: item.examples };
    }
  }
  return out;
}

/**
 * Maps a Zod response schema entry to a Kori response schema entry.
 *
 * Handles three types of entries: direct Zod schema, content-type mapping, and simple wrapper.
 *
 * @param entry - The Zod response schema entry to transform
 * @returns The Kori response schema entry
 *
 */
function toKoriEntry(entry: KoriZodResponseSchemaEntry): KoriResponseSchemaEntry<KoriZodSchemaProvider> {
  // simple: zod directly
  if (isZodType(entry)) {
    return createKoriZodSchema(entry);
  }
  // content entry
  if ('content' in entry) {
    return {
      description: entry.description,
      headers: entry.headers ? createKoriZodSchema(entry.headers) : undefined,
      content: toKoriContent(entry.content),
      links: entry.links,
    };
  }
  // simple: spec
  return {
    description: entry.description,
    headers: entry.headers ? createKoriZodSchema(entry.headers) : undefined,
    schema: createKoriZodSchema(entry.schema),
    examples: entry.examples,
    links: entry.links,
  };
}

/**
 * Maps Zod response entries keyed by status code to the matching Kori entries.
 *
 * @template ZResponses - Zod response schema entries mapped by status code
 * @param responses - Zod response schema entries mapped by status code
 *
 * @internal
 */
export function toKoriEntries<
  ZResponses extends Partial<Record<KoriResponseSchemaStatusCode, KoriZodResponseSchemaEntry>>,
>(responses: ZResponses): KoriResponseSchemaZodToEntries<ZResponses> {
  const out = {} as KoriResponseSchemaZodToEntries<ZResponses>;

  for (const status of Object.keys(responses) as (keyof ZResponses)[]) {
    const entry = responses[status];
    if (!entry) {
      continue;
    }

    const key = status as keyof KoriResponseSchemaZodToEntries<ZResponses>;
    out[key] = toKoriEntry(entry as unknown as KoriZodResponseSchemaEntry) as (typeof out)[typeof key];
  }

  return out;
}

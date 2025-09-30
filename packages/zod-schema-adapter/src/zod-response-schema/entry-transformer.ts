import {
  type KoriResponseSchemaContentEntry,
  type KoriResponseSchemaEntry,
  type KoriResponseSchemaStatusCode,
} from '@korix/kori';
import { type z } from 'zod';

import { isZodType } from '../util/index.js';
import { type KoriZodSchema, type KoriZodSchemaProvider, createKoriZodSchema } from '../zod-schema/index.js';

import { type KoriZodResponseSchemaEntry } from './entry.js';

/**
 * Maps each content-type entry from Zod definitions to Kori schema items.
 *
 * @template M - Content-type mapping supplied to the response schema builder
 */
export type KoriResponseSchemaZodToContentMap<M extends Record<string, z.ZodType>> = {
  [K in keyof M]: KoriZodSchema<M[K]>;
};

/**
 * Maps a Zod response schema entry definition to the matching Kori schema entry type.
 *
 * @template E - Zod response schema entry definition provided in the response schema options
 */
export type KoriResponseSchemaZodToEntry<E extends KoriZodResponseSchemaEntry> =
  // simple
  E extends z.ZodType
    ? KoriZodSchema<E>
    : // content: content map
      E extends { content: infer CM; headers?: infer H extends z.ZodType }
      ? KoriResponseSchemaContentEntry<
          KoriZodSchema<H>,
          KoriResponseSchemaZodToContentMap<Extract<CM, Record<string, z.ZodType>>>
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
function toKoriContent(content: Record<string, z.ZodType>): Record<string, KoriZodSchema<z.ZodType>> {
  const out: Record<string, KoriZodSchema<z.ZodType>> = {};
  for (const [mt, item] of Object.entries(content)) {
    out[mt] = createKoriZodSchema(item);
  }
  return out;
}

/**
 * Maps a Zod response schema entry to a Kori response schema entry.
 *
 * @param entry - The Zod response schema entry to transform
 * @returns The Kori response schema entry
 *
 */
function toKoriEntry(entry: KoriZodResponseSchemaEntry): KoriResponseSchemaEntry<KoriZodSchemaProvider> {
  // simple entry
  if (isZodType(entry)) {
    return createKoriZodSchema(entry);
  }

  // content entry
  return {
    description: entry.description,
    headers: entry.headers ? createKoriZodSchema(entry.headers) : undefined,
    content: toKoriContent(entry.content),
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

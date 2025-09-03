import {
  createKoriResponseSchema,
  type KoriResponseSchema,
  type KoriResponseSchemaContentEntry,
  type KoriResponseSchemaContentEntryItem,
  type KoriResponseSchemaEntry,
  type KoriResponseSchemaSimpleEntry,
  type KoriResponseSchemaStatusCode,
} from '@korix/kori';
import { type z } from 'zod';

import {
  type KoriZodSchema,
  type KoriZodSchemaProvider,
  ZodSchemaProvider,
  createKoriZodSchema,
} from './zod-schema.js';

export type KoriZodResponseSchema<
  Responses extends Partial<Record<KoriResponseSchemaStatusCode, KoriResponseSchemaEntry<KoriZodSchemaProvider>>>,
> = KoriResponseSchema<KoriZodSchemaProvider, Responses>;

type ZodResponseSchemaSimpleEntry<ZHeaders extends z.ZodType, Z extends z.ZodType> =
  | Z
  | {
      description?: string;
      headers?: ZHeaders;
      schema: Z;
      examples?: Record<string, unknown>;
      links?: Record<string, unknown>;
    };

type ZodResponseSchemaContentEntryItem<Z extends z.ZodType> =
  | Z
  | {
      schema: Z;
      examples?: Record<string, unknown>;
    };

type ZodResponseSchemaContentEntryItemDefault = ZodResponseSchemaContentEntryItem<z.ZodType>;

type ZodResponseSchemaContentEntryMappingDefault = Record<string, ZodResponseSchemaContentEntryItemDefault>;

type ZodResponseSchemaContentEntry<
  ZHeaders extends z.ZodType,
  ZContentMapping extends ZodResponseSchemaContentEntryMappingDefault,
> = {
  description?: string;
  headers?: ZHeaders;
  content: ZContentMapping;
  links?: Record<string, unknown>;
};

type ZodResponseSchemaEntry =
  | ZodResponseSchemaSimpleEntry<z.ZodType, z.ZodType>
  | ZodResponseSchemaContentEntry<z.ZodType, ZodResponseSchemaContentEntryMappingDefault>;

type ZContentItemToKori<Item> = Item extends z.ZodType
  ? KoriResponseSchemaContentEntryItem<KoriZodSchema<Item>>
  : Item extends { schema: infer SZ; examples?: infer EX }
    ? SZ extends z.ZodType
      ? { schema: KoriZodSchema<SZ>; examples?: EX }
      : never
    : never;

type ZContentMapToKori<Map extends ZodResponseSchemaContentEntryMappingDefault> = {
  [K in keyof Map]: ZContentItemToKori<Map[K]>;
};

type ZEntryToKori<E> =
  // simple
  E extends z.ZodType
    ? KoriResponseSchemaSimpleEntry<KoriZodSchema<z.ZodType>, KoriZodSchema<E>>
    : // simple wrapper
      E extends { schema: infer SZ; headers?: infer H }
      ? SZ extends z.ZodType
        ? KoriResponseSchemaSimpleEntry<
            H extends z.ZodType ? KoriZodSchema<H> : KoriZodSchema<z.ZodType>,
            KoriZodSchema<SZ>
          >
        : never
      : // content: content map
        E extends { content: infer CM; headers?: infer H }
        ? KoriResponseSchemaContentEntry<
            H extends z.ZodType ? KoriZodSchema<H> : KoriZodSchema<z.ZodType>,
            ZContentMapToKori<Extract<CM, ZodResponseSchemaContentEntryMappingDefault>>
          >
        : never;

export type ToKoriZodResponseSchema<
  ZResponses extends Partial<Record<KoriResponseSchemaStatusCode, ZodResponseSchemaEntry>>,
> = KoriZodResponseSchema<{ [S in keyof ZResponses]?: ZEntryToKori<ZResponses[S]> }>;

function isZodType(value: unknown): value is z.ZodType {
  return !!value && typeof value === 'object' && 'safeParse' in (value as Record<string, unknown>);
}

function toKoriContent(
  content: ZodResponseSchemaContentEntryMappingDefault,
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

function toKoriEntry(entry: ZodResponseSchemaEntry) {
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

export function zodResponseSchema<
  ZResponses extends Partial<Record<KoriResponseSchemaStatusCode, ZodResponseSchemaEntry>>,
>(responses: ZResponses): ToKoriZodResponseSchema<ZResponses> {
  const out = {} as { [S in keyof ZResponses]?: ZEntryToKori<ZResponses[S]> };

  for (const status in responses) {
    const entry = responses[status] as ZodResponseSchemaEntry;
    if (entry !== undefined) {
      out[status] = toKoriEntry(entry) as ZEntryToKori<ZResponses[typeof status]>;
    }
  }

  return createKoriResponseSchema({
    provider: ZodSchemaProvider,
    responses: out as unknown as Partial<
      Record<KoriResponseSchemaStatusCode, KoriResponseSchemaEntry<KoriZodSchemaProvider>>
    >,
  }) as ToKoriZodResponseSchema<ZResponses>;
}
